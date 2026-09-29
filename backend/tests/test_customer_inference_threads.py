import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from customer_visual_features import inference_thread_count


class InferenceThreadsTests(unittest.TestCase):
    def check(self, files, affinity=8):
        def read(path):
            if str(path) not in files: raise FileNotFoundError()
            return files[str(path)]
        with patch('customer_visual_features.os.cpu_count', return_value=8), \
             patch('customer_visual_features.os.sched_getaffinity', return_value=set(range(affinity))), \
             patch.object(Path, 'read_text', read):
            return inference_thread_count()

    def test_v2_container_quota_overrides_host_cpu_count(self):
        for quota in ('50000', '100000', '150000'):
            self.assertEqual(self.check({'/sys/fs/cgroup/cpu.max': quota+' 100000'}), 1)
        self.assertEqual(self.check({'/sys/fs/cgroup/cpu.max': '200000 100000'}), 2)

    def test_v1_quota_and_cpuset(self):
        self.assertEqual(self.check({'/sys/fs/cgroup/cpu/cpu.cfs_quota_us': '100000',
                                    '/sys/fs/cgroup/cpu/cpu.cfs_period_us': '100000'}), 1)
        self.assertEqual(self.check({}, affinity=1), 1)

    def test_unlimited_missing_or_malformed_preserves_two_threads(self):
        for value in ('max 100000', 'invalid', '100000 0'):
            self.assertEqual(self.check({'/sys/fs/cgroup/cpu.max': value}), 2)
        self.assertEqual(self.check({}), 2)
