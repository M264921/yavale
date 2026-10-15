"""Select an available iOS simulator instead of pinning an absent model/OS."""
import json
import subprocess

data = json.loads(subprocess.check_output(['xcrun', 'simctl', 'list', 'devices', 'available', '--json']))
devices = [device for runtime, group in data['devices'].items() if '.iOS-' in runtime
           for device in group if device.get('isAvailable') and 'iPhone' in device['name']]
if not devices:
    raise SystemExit('No available iPhone simulator on this runner')
print('platform=iOS Simulator,id=' + devices[0]['udid'])
