import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('workspace', Path(__file__).resolve().parents[1] / 'tools/workspace.py')
w = importlib.util.module_from_spec(spec)
spec.loader.exec_module(w)


class WorkspaceTests(unittest.TestCase):
    def test_retrieval_and_deleted_sources(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root/'memory').mkdir()
            source = root/'memory/score.md'
            source.write_text('Offline judging requires score conflict resolution.', encoding='utf-8')
            hits = w.search(root, 'offline score')
            self.assertEqual(hits[0]['path'], 'memory/score.md')
            self.assertEqual(w.search(root, 'xyzunknown'), [])
            source.unlink()
            self.assertEqual(w.search(root, 'offline score'), [])

    def test_dag(self):
        tasks = [dict(id='a', depends_on=[], status='todo'), dict(id='b', depends_on=['a'], status='todo')]
        self.assertEqual(w.validate_dag(tasks)['ready'], ['a'])
        tasks[0]['depends_on'] = ['b']
        with self.assertRaises(ValueError):
            w.validate_dag(tasks)
        tasks[0]['depends_on'] = ['missing']
        with self.assertRaises(ValueError):
            w.validate_dag(tasks)

    def test_completion_requires_evidence(self):
        with self.assertRaises(ValueError):
            w.validate_dag([dict(id='a', depends_on=[], status='done')])


if __name__ == '__main__':
    unittest.main()
