import React, { useEffect } from 'react';
import { settingsService } from '../services/supabaseService';
import { Settings } from '../types';

const HeartbeatStatus: React.FC = () => {
  const [settings, setSettings] = React.useState<Settings | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const settingsData = await settingsService.get();
        setSettings(settingsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
    
    // Set up interval to refresh every 5 minutes
    const interval = setInterval(loadSettings, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (lastHeartbeat: string | null | undefined) => {
    if (!lastHeartbeat) return 'text-gray-500';
    
    const now = new Date();
    const lastHeartbeatDate = new Date(lastHeartbeat);
    const hoursSince = (now.getTime() - lastHeartbeatDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursSince < 24) return 'text-green-600';
    if (hoursSince < 48) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusText = (lastHeartbeat: string | null | undefined) => {
    if (!lastHeartbeat) return 'No heartbeat recorded';
    
    const now = new Date();
    const lastHeartbeatDate = new Date(lastHeartbeat);
    const hoursSince = (now.getTime() - lastHeartbeatDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursSince < 24) return 'Healthy';
    if (hoursSince < 48) return 'Warning';
    return 'Critical';
  };

  const getStatusIcon = (lastHeartbeat: string | null | undefined) => {
    if (!lastHeartbeat) return '⚠️';
    
    const now = new Date();
    const lastHeartbeatDate = new Date(lastHeartbeat);
    const hoursSince = (now.getTime() - lastHeartbeatDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursSince < 24) return '✅';
    if (hoursSince < 48) return '⚠️';
    return '❌';
  };

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg bg-white shadow">
        <div className="animate-pulse flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
        </div>
        <p className="text-center text-gray-600 mt-2">Loading heartbeat status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-red-50 border-red-200">
        <div className="flex items-center">
          <div className="text-red-600 text-lg">❌</div>
          <div>
            <h3 className="text-lg font-semibold text-red-800">Error Loading Heartbeat</h3>
            <p className="text-red-600">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="text-center">
          <div className="text-gray-600 text-lg">⚠️</div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">No Settings Found</h3>
            <p className="text-gray-600">Unable to load settings. Please check your database connection.</p>
          </div>
        </div>
      </div>
    );
  }

  const lastHeartbeat = settings?.last_heartbeat_at;
  const statusColor = getStatusColor(lastHeartbeat);
  const statusText = getStatusText(lastHeartbeat);
  const statusIcon = getStatusIcon(lastHeartbeat);

  return (
    <div className="p-4 border rounded-lg bg-white shadow">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Supabase Heartbeat Status</h3>
        
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
          statusColor === 'text-green-600' ? 'bg-green-100' : 
          statusColor === 'text-yellow-600' ? 'bg-yellow-100' : 'bg-red-100'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${
            statusColor === 'text-green-600' ? 'bg-green-500' : 
            statusColor === 'text-yellow-600' ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <span className={`font-medium ${
            statusColor === 'text-green-600' ? 'text-green-800' : 
            statusColor === 'text-yellow-600' ? 'text-yellow-800' : 'text-red-800'
          }`}>
            {statusText}
          </span>
        </div>
        
        <div className="mt-2 text-sm text-gray-600">
          <p>Last heartbeat: {lastHeartbeat ? new Date(lastHeartbeat).toLocaleString() : 'Never'}</p>
          {lastHeartbeat && (
            <p className="text-xs text-gray-500 mt-1">
              Next check: {new Date(new Date(lastHeartbeat).getTime() + 24 * 60 * 60 * 1000).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <h4 className="font-medium text-gray-700 mb-2">System Information</h4>
        <div className="bg-gray-50 p-3 rounded text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-medium text-gray-700">Status:</p>
              <p className={`font-bold ${statusColor}`}>{statusText}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Last Check:</p>
              <p className="font-mono">{lastHeartbeat ? new Date(lastHeartbeat).toLocaleString() : 'Never'}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Next Check:</p>
              <p className="font-mono">
                {lastHeartbeat ? new Date(new Date(lastHeartbeat).getTime() + 24 * 60 * 60 * 1000).toLocaleString() : 'Not scheduled'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <h4 className="font-medium text-gray-700 mb-2">Heartbeat Details</h4>
        <div className="bg-gray-50 p-3 rounded text-sm">
          {lastHeartbeat && (
            <div className="space-y-2">
              <div>
                <span className="font-medium text-gray-700">Executed at:</span>
                <span className="font-mono">{new Date(lastHeartbeat).toLocaleString()}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Time since:</span>
                <span className="font-mono">
                  {Math.floor((new Date().getTime() - new Date(lastHeartbeat).getTime()) / (1000 * 60 * 60))} hours
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>
          <strong>Note:</strong> This status shows the last successful heartbeat from the Netlify function. 
          The heartbeat runs daily at 9:00 AM UTC to keep your Supabase project active.
        </p>
      </div>
    </div>
  );
};

export default HeartbeatStatus;