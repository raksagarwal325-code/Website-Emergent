"""Small batches for regional queries; catalogue and normal encoding stay unchanged."""
import time

import numpy as np
from PIL import Image, ImageOps

from customer_visual_features import model_input


class RegionDeadline(Exception):
    pass


class RegionEncoder:
    """Use the same views and model, with at most four inputs per inference call."""
    def __init__(self, encoder, deadline, cancelled):
        self.encoder = encoder
        self.deadline = deadline
        self.cancelled = cancelled

    def _check(self):
        if self.cancelled.is_set() or time.monotonic() >= self.deadline:
            raise RegionDeadline()

    def _views(self, images):
        views = []
        for image in images:
            self._check()
            whole = ImageOps.pad(image, (256, 256), method=Image.Resampling.BICUBIC, color='white')
            views.extend((image, whole))
        result = []
        for start in range(0, len(views), 4):
            self._check()
            inputs = np.concatenate([model_input(view) for view in views[start:start+4]])
            remaining = max(0, self.deadline - time.monotonic())
            if not self.encoder.lock.acquire(timeout=remaining):
                raise RegionDeadline()
            try:
                self._check()
                vectors = self.encoder.session.run(['last_hidden_state'], {'pixel_values': inputs})[0][:, 0]
            finally:
                self.encoder.lock.release()
            self._check()
            vectors = vectors / np.maximum(np.linalg.norm(vectors, axis=1, keepdims=True), 1e-12)
            result.extend(vectors.astype(float).tolist())
        return result

    def encode(self, image):
        return self._views([image])

    def encode_many(self, images):
        vectors = self._views(images)
        return [vectors[i:i+2] for i in range(0, len(vectors), 2)]

    def encode_query(self, image):
        images = [image]
        for box in ((0, 0, .7, 1), (.3, 0, 1, 1), (.15, 0, .85, .6),
                    (.15, .2, .85, .8), (.15, .4, .85, 1)):
            bounds = tuple(round(value * (image.width if i % 2 == 0 else image.height))
                           for i, value in enumerate(box))
            if bounds[2] > bounds[0] and bounds[3] > bounds[1]:
                images.append(image.crop(bounds))
        return self._views(images)
