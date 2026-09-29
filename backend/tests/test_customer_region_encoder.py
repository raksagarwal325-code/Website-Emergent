import sys
import threading
import time
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from customer_region_encoder import RegionEncoder, RegionDeadline
from customer_visual_features import VisualEncoder


class Session:
    def __init__(self):
        self.inputs = []

    def run(self, outputs, inputs):
        values = inputs['pixel_values']
        self.inputs.extend(values.copy())
        vectors = np.tile(values.mean(axis=(2, 3)), (1, 128)).astype(np.float32)
        return [vectors[:, None, :]]


class RegionEncoderTests(unittest.TestCase):
    def test_identical_views_and_vectors_to_existing_encoder(self):
        pixels = np.random.default_rng(2).integers(0, 256, (240, 320, 3), dtype=np.uint8)
        image = Image.fromarray(pixels)
        serial = VisualEncoder(); serial.session = Session()
        expected = serial.encode_query(image)[1::2]
        batched = VisualEncoder(); batched.session = Session()
        run = Mock(wraps=batched.session.run)
        batched.session.run = run
        actual = RegionEncoder(batched, time.monotonic()+30, threading.Event()).encode_query(image)
        np.testing.assert_array_equal(serial.session.inputs[1::2], batched.session.inputs)
        np.testing.assert_allclose(expected, actual, atol=1e-7)
        self.assertEqual(run.call_count, 6)
        self.assertTrue(all(call.args[1]['pixel_values'].shape[0] == 1 for call in run.call_args_list))
        self.assertFalse(batched.lock.locked())

    def test_cancelled_and_expired_queries_never_start_inference(self):
        for expired in (False, True):
            cancelled = threading.Event()
            if not expired: cancelled.set()
            encoder = VisualEncoder(); encoder.session = SimpleNamespace(run=Mock())
            worker = RegionEncoder(encoder, time.monotonic()+(-1 if expired else 30), cancelled)
            with self.assertRaises(RegionDeadline):
                worker.encode(Image.new('RGB', (100, 100)))
            encoder.session.run.assert_not_called()

    def test_lock_wait_and_between_view_cancellation_are_bounded(self):
        cancelled = threading.Event()
        encoder = VisualEncoder(); encoder.session = Session()
        encoder.lock = Mock(acquire=Mock(return_value=False))
        worker = RegionEncoder(encoder, time.monotonic()+1, cancelled)
        with self.assertRaises(RegionDeadline): worker.encode(Image.new('RGB', (100, 100)))
        self.assertLessEqual(encoder.lock.acquire.call_args.kwargs['timeout'], 1)
        encoder.lock.release.assert_not_called()
        encoder.lock = threading.Lock()
        def run(*args):
            cancelled.set()
            return [np.zeros((1, 1, 384), dtype=np.float32)]
        encoder.session.run = Mock(side_effect=run)
        with self.assertRaises(RegionDeadline): worker.encode_query(Image.new('RGB', (100, 100)))
        self.assertEqual(encoder.session.run.call_count, 1)
        self.assertFalse(encoder.lock.locked())

    def test_inference_error_releases_shared_lock(self):
        encoder = VisualEncoder()
        encoder.session = SimpleNamespace(run=Mock(side_effect=RuntimeError('model failure')))
        with self.assertRaises(RuntimeError):
            RegionEncoder(encoder, time.monotonic()+30, threading.Event()).encode(Image.new('RGB', (100, 100)))
        self.assertFalse(encoder.lock.locked())

    def test_full_rescue_uses_33_passes_and_reports_outcome(self):
        from customer_region_search import rescue_region_matches
        encoder = VisualEncoder()
        value = np.zeros((1, 1, 384), dtype=np.float32); value[0, 0, 0] = 1
        encoder.session = SimpleNamespace(run=Mock(return_value=[value]))
        rows = [{'url': '/a', 'vectors': [value[0, 0].tolist()]*2}]
        mapping = {'/a': [{'id': 'new'}]}
        old = [{'product': {'id': 'old'}, 'score': .77, 'match_type': 'similar'}]
        diagnostic = {}
        result = rescue_region_matches(encoder, Image.new('RGB', (400, 300)), rows, mapping,
                                       old, threading.Event(), diagnostic)
        self.assertEqual(result[0]['product']['id'], 'new')
        self.assertEqual(encoder.session.run.call_count, 33)
        self.assertEqual(diagnostic['outcome'], 'matched')
        self.assertEqual(diagnostic['coarse_regions'], 18)
        self.assertEqual(diagnostic['refined_regions'], 3)

    def test_expired_rescue_preserves_results_and_reports_budget(self):
        from unittest.mock import patch
        from customer_region_search import rescue_region_matches
        encoder = VisualEncoder(); encoder.session = SimpleNamespace(run=Mock())
        value = np.zeros((2, 384), dtype=np.float32).tolist()
        old = [{'product': {'id': 'old'}, 'score': .77, 'match_type': 'similar'}]
        diagnostic = {}
        with patch('customer_region_search.REGION_SECONDS', 0):
            result = rescue_region_matches(encoder, Image.new('RGB', (400, 300)),
                [{'url': '/a', 'vectors': value}], {'/a': [{'id': 'new'}]}, old, threading.Event(), diagnostic)
        self.assertIs(result, old)
        self.assertEqual(diagnostic['outcome'], 'budget_exceeded')
        encoder.session.run.assert_not_called()

    def test_stage_timings_separate_wait_from_model_even_on_deadline(self):
        from unittest.mock import patch
        import customer_region_encoder as module
        for lock_wait, model_time in ((2.0, 0.25), (0.0, 4.0)):
            clock = [0.0]
            encoder = VisualEncoder()
            def acquire(**kwargs):
                clock[0] += lock_wait
                return True
            encoder.lock = Mock(acquire=Mock(side_effect=acquire))
            def run(*args):
                clock[0] += model_time
                return [np.ones((1, 1, 384), dtype=np.float32)]
            encoder.session = SimpleNamespace(run=Mock(side_effect=run))
            worker = RegionEncoder(encoder, 3.0, threading.Event())
            with patch.object(module.time, 'monotonic', side_effect=lambda: clock[0]):
                if model_time > 3:
                    with self.assertRaises(RegionDeadline):
                        worker.encode(Image.new('RGB', (100, 100)))
                else:
                    worker.encode(Image.new('RGB', (100, 100)))
            self.assertEqual(worker.timings['lock_wait_seconds'], lock_wait)
            self.assertEqual(worker.timings['inference_seconds'], model_time)
            self.assertEqual(worker.timings['inference_calls'], 1)
            encoder.lock.release.assert_called_once()

    def test_lock_timeout_is_measured_without_inference_or_unlock(self):
        from unittest.mock import patch
        import customer_region_encoder as module
        clock = [0.0]
        encoder = VisualEncoder(); encoder.session = SimpleNamespace(run=Mock())
        def acquire(**kwargs):
            clock[0] += kwargs['timeout']
            return False
        encoder.lock = Mock(acquire=Mock(side_effect=acquire))
        worker = RegionEncoder(encoder, 3.0, threading.Event())
        with patch.object(module.time, 'monotonic', side_effect=lambda: clock[0]):
            with self.assertRaises(RegionDeadline):
                worker.encode(Image.new('RGB', (100, 100)))
        self.assertEqual(worker.timings['lock_wait_seconds'], 3.0)
        self.assertEqual(worker.timings['lock_timeouts'], 1)
        self.assertEqual(worker.timings['inference_calls'], 0)
        self.assertEqual(worker.timings['inference_seconds'], 0.0)
        encoder.session.run.assert_not_called()
        encoder.lock.release.assert_not_called()
