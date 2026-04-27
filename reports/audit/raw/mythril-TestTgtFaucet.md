Traceback (most recent call last):
  File "/home/mhbs/.venvs/tesserate-mythril/bin/myth", line 3, in <module>
    from mythril.interfaces.cli import main
  File "/home/mhbs/.venvs/tesserate-mythril/lib/python3.10/site-packages/mythril/__init__.py", line 8, in <module>
    from mythril.plugin.loader import MythrilPluginLoader
  File "/home/mhbs/.venvs/tesserate-mythril/lib/python3.10/site-packages/mythril/plugin/__init__.py", line 1, in <module>
    from mythril.plugin.interface import MythrilPlugin, MythrilCLIPlugin
  File "/home/mhbs/.venvs/tesserate-mythril/lib/python3.10/site-packages/mythril/plugin/interface.py", line 2, in <module>
    from mythril.laser.plugin.builder import PluginBuilder as LaserPluginBuilder
  File "/home/mhbs/.venvs/tesserate-mythril/lib/python3.10/site-packages/mythril/laser/plugin/builder.py", line 1, in <module>
    from mythril.laser.plugin.interface import LaserPlugin
  File "/home/mhbs/.venvs/tesserate-mythril/lib/python3.10/site-packages/mythril/laser/plugin/interface.py", line 1, in <module>
    from mythril.laser.ethereum.svm import LaserEVM
  File "/home/mhbs/.venvs/tesserate-mythril/lib/python3.10/site-packages/mythril/laser/ethereum/svm.py", line 10, in <module>
    from mythril.analysis.potential_issues import check_potential_issues
  File "/home/mhbs/.venvs/tesserate-mythril/lib/python3.10/site-packages/mythril/analysis/potential_issues.py", line 1, in <module>
    from mythril.analysis.report import Issue
  File "/home/mhbs/.venvs/tesserate-mythril/lib/python3.10/site-packages/mythril/analysis/report.py", line 9, in <module>
    from eth_abi import decode
  File "/home/mhbs/.venvs/tesserate-mythril/lib/python3.10/site-packages/eth_abi/__init__.py", line 2, in <module>
    from importlib.metadata import (
  File "/usr/lib/python3.10/importlib/metadata/__init__.py", line 26, in <module>
    from importlib.abc import MetaPathFinder
  File "<frozen importlib._bootstrap>", line 1027, in _find_and_load
  File "<frozen importlib._bootstrap>", line 1006, in _find_and_load_unlocked
  File "<frozen importlib._bootstrap>", line 688, in _load_unlocked
  File "<frozen importlib._bootstrap_external>", line 879, in exec_module
  File "<frozen importlib._bootstrap_external>", line 975, in get_code
  File "<frozen importlib._bootstrap_external>", line 1074, in get_data
KeyboardInterrupt
