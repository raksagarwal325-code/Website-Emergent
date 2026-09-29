"""Aspect-preserving regional views without duplicating inference work."""
import time

import numpy as np
from PIL import Image, ImageOps

from customer_visual_features import model_input


class RegionDeadline(Exception):
    pass


class RegionEncoder:
    """Use padded views for narrow regions, reusing the initial coarse vector."""
    def __init__(self, encoder, deadline, cancelled):
        self.encoder = encoder
        self.deadline = deadline
        self.cancelled = cancelled
        self.timings = dict(preprocess_seconds=0.0, lock_wait_seconds=0.0,
                            inference_seconds=0.0, inference_thread_cpu_seconds=0.0,
                            inference_calls=0, lock_timeouts=0)

    def _check(self):
        if self.cancelled.is_set() or time.monotonic() >= self.deadline:
            raise RegionDeadline()

    def encode(self, image):
        self._check()
        started = time.monotonic()
        try:
            whole = ImageOps.pad(image, (256, 256), method=Image.Resampling.BICUBIC, color='white')
            inputs = model_input(whole)
        finally:
            self.timings['preprocess_seconds'] += time.monotonic() - started
        remaining = max(0, self.deadline - time.monotonic())
        started = time.monotonic()
        acquired = self.encoder.lock.acquire(timeout=remaining)
        self.timings['lock_wait_seconds'] += time.monotonic() - started
        if not acquired:
            self.timings['lock_timeouts'] += 1
            raise RegionDeadline()
        try:
            self._check()
            started = time.monotonic()
            cpu_started = time.thread_time()
            self.timings['inference_calls'] += 1
            try:
                vector = self.encoder.session.run(['last_hidden_state'], {'pixel_values': inputs})[0][0, 0]
            finally:
                self.timings['inference_seconds'] += time.monotonic() - started
                self.timings['inference_thread_cpu_seconds'] += time.thread_time() - cpu_started
        finally:
            self.encoder.lock.release()
        self._check()
        vector = vector / max(float(np.linalg.norm(vector)), 1e-12)
        return [vector.astype(float).tolist()]

    def encode_query(self, image, initial=None):
        vectors = list(initial) if initial is not None else self.encode(image)
        for box in ((0, 0, .7, 1), (.3, 0, 1, 1), (.15, 0, .85, .6),
                    (.15, .2, .85, .8), (.15, .4, .85, 1)):
            bounds = tuple(round(value * (image.width if i % 2 == 0 else image.height))
                           for i, value in enumerate(box))
            if bounds[2] > bounds[0] and bounds[3] > bounds[1]:
                vectors.extend(self.encode(image.crop(bounds)))
        return vectors
