import { isSupabaseConfigured } from "../lib/supabase";
import { useStore } from "../store/useStore";

export default function SettingsPage() {
  const { incentiveSettings } = useStore();

  const supabaseConfigured = isSupabaseConfigured();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-surface-900">Settings</h1>
        <p className="text-surface-500 mt-1">
          Configure system settings and preferences
        </p>
      </div>

      {/* Connection Status */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6">
        <h2 className="font-semibold text-surface-900 mb-4">
          Database Connection
        </h2>
        <div className="flex items-center gap-4">
          <div
            className={`w-3 h-3 rounded-full ${supabaseConfigured ? "bg-green-500" : "bg-yellow-500"}`}
          />
          <div>
            <p className="font-medium text-surface-900">
              {supabaseConfigured ? "Connected to Supabase" : "Demo Mode"}
            </p>
            <p className="text-sm text-surface-500">
              {supabaseConfigured
                ? "Real-time sync enabled"
                : "Configure Supabase credentials to enable data persistence"}
            </p>
          </div>
        </div>

        {!supabaseConfigured && (
          <div className="mt-4 p-4 rounded-xl bg-yellow-50 border border-yellow-100">
            <h4 className="font-medium text-yellow-800 mb-2">
              Setup Instructions
            </h4>
            <p className="text-sm text-yellow-700 mb-3">
              To connect to Supabase and enable real-time data sync:
            </p>
            <ol className="text-sm text-yellow-700 space-y-2 list-decimal list-inside">
              <li>
                Create a Supabase project at{" "}
                <code className="bg-yellow-100 px-1 rounded">supabase.com</code>
              </li>
              <li>
                Run the migration files in{" "}
                <code className="bg-yellow-100 px-1 rounded">
                  supabase/migrations/
                </code>
              </li>
              <li>
                Create a{" "}
                <code className="bg-yellow-100 px-1 rounded">.env</code> file
                with your credentials
              </li>
              <li>Restart the development server</li>
            </ol>
            <div className="mt-3 p-3 rounded-lg bg-yellow-100 font-mono text-xs text-yellow-800">
              VITE_SUPABASE_URL=your-project-url
              <br />
              VITE_SUPABASE_ANON_KEY=your-anon-key
            </div>
          </div>
        )}
      </div>

      {/* Incentive Settings */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6">
        <h2 className="font-semibold text-surface-900 mb-4">
          Incentive Settings
        </h2>
        {incentiveSettings.length > 0 ? (
          <div className="space-y-4">
            {incentiveSettings.map((setting) => (
              <div
                key={setting.id}
                className="flex items-start justify-between p-4 rounded-xl bg-surface-50"
              >
                <div>
                  <p className="font-medium text-surface-900">
                    {setting.setting_key
                      .split("_")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(" ")}
                  </p>
                  <p className="text-sm text-surface-500 mt-0.5">
                    {setting.description}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm text-surface-700">
                    {JSON.stringify(setting.setting_value)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-surface-500">No incentive settings configured</p>
        )}
      </div>

      {/* App Info */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6">
        <h2 className="font-semibold text-surface-900 mb-4">
          Application Info
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-surface-500">Version</p>
            <p className="font-medium text-surface-900">1.0.0</p>
          </div>
          <div>
            <p className="text-surface-500">Environment</p>
            <p className="font-medium text-surface-900">
              {import.meta.env.MODE === "production"
                ? "Production"
                : "Development"}
            </p>
          </div>
          <div>
            <p className="text-surface-500">Framework</p>
            <p className="font-medium text-surface-900">React + Vite</p>
          </div>
          <div>
            <p className="text-surface-500">Database</p>
            <p className="font-medium text-surface-900">
              Supabase (PostgreSQL)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
