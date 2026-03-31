'use client';

export default function GeneralSettings() {
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">System Preferences</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Language
            </label>
            <select className="input max-w-xs">
              <option>English (US)</option>
              <option>English (UK)</option>
              <option>Spanish</option>
              <option>French</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Format
            </label>
            <select className="input max-w-xs">
              <option>MM/DD/YYYY</option>
              <option>DD/MM/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select className="input max-w-xs">
              <option>USD ($)</option>
              <option>EUR (€)</option>
              <option>GBP (£)</option>
              <option>CAD ($)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Data & Privacy</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Data Retention</p>
              <p className="text-sm text-gray-500">How long to keep conversation data</p>
            </div>
            <select className="input max-w-xs">
              <option>30 days</option>
              <option>90 days</option>
              <option>1 year</option>
              <option>Forever</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Analytics Tracking</p>
              <p className="text-sm text-gray-500">Allow usage analytics collection</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Danger Zone</h2>
        <div className="space-y-4">
          <div className="border border-red-200 rounded-lg p-4">
            <h3 className="font-medium text-red-900 mb-2">Export Data</h3>
            <p className="text-sm text-red-700 mb-3">Download all your data including conversations, analytics, and settings</p>
            <button className="btn-secondary text-sm">Export Data</button>
          </div>
          <div className="border border-red-200 rounded-lg p-4">
            <h3 className="font-medium text-red-900 mb-2">Delete Account</h3>
            <p className="text-sm text-red-700 mb-3">Permanently delete your account and all associated data</p>
            <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}