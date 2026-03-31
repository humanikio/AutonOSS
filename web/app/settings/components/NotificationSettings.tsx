'use client';

export default function NotificationSettings() {
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Email Notifications</h2>
        <div className="space-y-4">
          {[
            { label: 'New message received', description: 'Get notified when customers send new messages' },
            { label: 'Call completed', description: 'Receive alerts when call bots complete conversations' },
            { label: 'Agent performance alerts', description: 'Get notified when agent performance drops' },
            { label: 'System maintenance', description: 'Important updates about system maintenance' },
            { label: 'Weekly reports', description: 'Automated weekly performance summaries' }
          ].map((item, i) => (
            <div key={i} className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
              <div>
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked={i < 3} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Push Notifications</h2>
        <div className="space-y-4">
          <label className="flex items-center">
            <input type="checkbox" className="mr-3" defaultChecked />
            <span className="text-sm">Enable browser notifications</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="mr-3" />
            <span className="text-sm">Enable mobile app notifications</span>
          </label>
        </div>
      </div>
    </div>
  );
}