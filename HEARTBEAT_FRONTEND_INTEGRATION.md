# Frontend Integration: Heartbeat Status Display

## 🎯 Overview

This guide shows how to integrate the heartbeat status into your existing ERP frontend. The `last_heartbeat_at` field in the settings table now provides a convenient way to monitor heartbeat activity directly from your settings interface.

## 📋 Prerequisites

Ensure you have:
- ✅ Database migration applied (`20251216000001_add_heartbeat_field_to_settings.sql`)
- ✅ Netlify function deployed and running
- ✅ Settings service updated (`settingsService.updateHeartbeat()` function available)

## 🔧 Integration Options

### Option 1: Simple Settings Display

Add this to any existing settings component:

```typescript
// In your existing Settings component
import { Settings } from '../types';

const SettingsWithHeartbeat: React.FC<{ settings: Settings | null }> = ({ settings }) => {
  const lastHeartbeat = settings?.last_heartbeat_at;
  const isHealthy = lastHeartbeat && 
    (new Date().getTime() - new Date(lastHeartbeat).getTime()) < 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-4">
      {/* Existing settings fields */}
      {/* ... your current settings display ... */}
      
      {/* Heartbeat Status Section */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">System Status</h3>
        
        <div className="flex items-center space-x-4">
          <div className={`flex items-center px-3 py-1 rounded-full text-sm ${
            isHealthy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              isHealthy ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className={`font-medium ${
              isHealthy ? 'text-green-800' : 'text-red-800'
            }`}>
              {isHealthy ? 'System Healthy' : 'System Critical'}
            </span>
          </div>
          
          <div className="text-sm text-gray-600">
            <p>Last heartbeat: {lastHeartbeat ? new Date(lastHeartbeat).toLocaleString() : 'Never'}</p>
            {lastHeartbeat && (
              <p>Time since: {Math.floor((new Date().getTime() - new Date(lastHeartbeat).getTime()) / (1000 * 60 * 60))} hours</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
```

### Option 2: Standalone Heartbeat Component

Use the dedicated component we created:

```typescript
// Import the HeartbeatStatus component
import HeartbeatStatus from '../components/HeartbeatStatus';

// In your main dashboard or settings page
<div className="mb-6">
  <HeartbeatStatus />
</div>
```

### Option 3: Dashboard Integration

Add to your main dashboard:

```typescript
// In your Dashboard component
import { HeartbeatStatus } from '../components/HeartbeatStatus';

const Dashboard: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Your existing dashboard content */}
      <div className="col-span-1 md:col-span-3">
        <HeartbeatStatus />
      </div>
    </div>
  );
};
```

## 🔍 Query Examples

### Check Current Heartbeat Status

```sql
-- Simple status check
SELECT 
  last_heartbeat_at,
  CASE 
    WHEN last_heartbeat_at > NOW() - INTERVAL '24 hours' THEN 'Healthy'
    WHEN last_heartbeat_at > NOW() - INTERVAL '48 hours' THEN 'Warning'
    ELSE 'Critical'
  END as status,
  EXTRACT(EPOCH FROM (NOW() - last_heartbeat_at)) / 3600 as hours_since_heartbeat
FROM settings 
WHERE id = 1;

-- Detailed heartbeat history
SELECT 
  'Last Heartbeat' as source,
  last_heartbeat_at as executed_at,
  NULL as error_message
FROM settings 
WHERE last_heartbeat_at IS NOT NULL

UNION ALL

SELECT 
  'Heartbeat Logs' as source,
  executed_at,
  status,
  error_message
FROM heartbeat_logs 
ORDER BY executed_at DESC 
LIMIT 10;
```

### Check Heartbeat Health

```typescript
// Service function to check heartbeat health
export const checkHeartbeatHealth = async (): Promise<{
  isHealthy: boolean;
  lastHeartbeat: string | null;
  hoursSince: number;
  status: 'healthy' | 'warning' | 'critical';
}> => {
  const settings = await settingsService.get();
  
  if (!settings?.last_heartbeat_at) {
    return {
      isHealthy: false,
      lastHeartbeat: null,
      hoursSince: 0,
      status: 'critical'
    };
  }
  
  const now = new Date();
  const lastHeartbeat = new Date(settings.last_heartbeat_at);
  const hoursSince = (now.getTime() - lastHeartbeat.getTime()) / (1000 * 60 * 60);
  
  let status: 'healthy' | 'warning' | 'critical';
  if (hoursSince < 24) {
    status = 'healthy';
  } else if (hoursSince < 48) {
    status = 'warning';
  } else {
    status = 'critical';
  }
  
  return {
    isHealthy: status === 'healthy',
    lastHeartbeat: settings.last_heartbeat_at,
    hoursSince,
    status
  };
};
```

## 📱 Real-time Updates

### Automatic Updates

The heartbeat status will automatically update every 5 minutes when using the HeartbeatStatus component, ensuring your UI always shows the current system health.

### Manual Refresh

Users can manually refresh the heartbeat status by:

1. **Triggering Heartbeat**: Manually invoke the Netlify function
2. **Settings Refresh**: The component automatically refetches settings data

## 🎨 Styling Guidelines

### Status Colors

- **Healthy**: Green background (`bg-green-100`, `text-green-800`)
- **Warning**: Yellow background (`bg-yellow-100`, `text-yellow-800`)
- **Critical**: Red background (`bg-red-100`, `text-red-800`)

### Icons

- **Success**: ✅ (green checkmark)
- **Warning**: ⚠️ (yellow warning)
- **Error**: ❌ (red X)

## 📊 Monitoring Dashboard

### Key Metrics to Display

1. **Last Heartbeat Time**: Show exact timestamp of last successful heartbeat
2. **Hours Since Last**: Calculate and display time elapsed
3. **Status Indicator**: Visual indicator (color + icon) of system health
4. **Next Scheduled Time**: Show when next heartbeat is expected
5. **Success Rate**: Percentage of successful heartbeats over time period

### Sample Dashboard Layout

```typescript
const HeartbeatDashboard: React.FC = () => {
  const { data: heartbeatStats } = useQuery({
    queryKey: ['heartbeat-stats'],
    queryFn: () => getHeartbeatStats(),
    refetchInterval: 60000 // Refresh every minute
  });

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">System Monitoring</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Heartbeat Status */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Heartbeat Status</h3>
          <HeartbeatStatus />
        </div>
        
        {/* Statistics */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Statistics</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{heartbeatStats.successRate}%</div>
              <div className="text-sm text-blue-600">Success Rate</div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{heartbeatStats.totalExecutions}</div>
              <div className="text-sm text-green-600">Total Executions</div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{heartbeatStats.averageHoursBetween}</div>
              <div className="text-sm text-yellow-600">Avg Hours Between</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
```

## 🚨 Alerting Setup

### Email Notifications (Optional)

```typescript
// Add to your heartbeat service
export const checkAndAlert = async (): Promise<void> => {
  const health = await checkHeartbeatHealth();
  
  if (health.status === 'critical') {
    // Send email notification
    await sendAlertEmail({
      to: 'admin@yourcompany.com',
      subject: '🚨 Supabase Heartbeat Critical',
      message: `Heartbeat is ${health.hoursSince} hours old. Last execution: ${health.lastHeartbeat}`
    });
  }
};
```

### Browser Notifications

```typescript
// Add to your HeartbeatStatus component
useEffect(() => {
  if (status === 'critical' && !document.hidden) {
    // Show browser notification
    new Notification('Heartbeat Critical', {
      body: `Last heartbeat was ${hoursSince} hours ago`,
      icon: '/warning-icon.png'
    });
  }
}, [status, hoursSince]);
```

## 🔧 Customization Options

### Branding

```css
/* Custom colors for your brand */
.heartbeat-healthy {
  background-color: #10b981;
  color: #059669;
}

.heartbeat-warning {
  background-color: #f59e0b;
  color: #d97706;
}

.heartbeat-critical {
  background-color: #ef4444;
  color: #991b1b;
}
```

### Custom Messages

```typescript
// Customize status messages
const statusMessages = {
  healthy: 'System operating normally',
  warning: 'System attention needed',
  critical: 'System requires immediate attention',
  noData: 'Heartbeat data unavailable'
};
```

## 📱 Mobile Responsive Design

```css
/* Mobile styles for heartbeat status */
@media (max-width: 768px) {
  .heartbeat-status {
    padding: 1rem;
  }
  
  .heartbeat-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

@media (min-width: 769px) {
  .heartbeat-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }
}
```

## 🎯 Success Criteria

Your frontend integration is successful when:

✅ **Settings Display**: Shows last heartbeat timestamp from settings table  
✅ **Real-time Updates**: Status refreshes automatically every 5 minutes  
✅ **Visual Indicators**: Clear color-coded status (green/yellow/red)  
✅ **Health Monitoring**: Displays hours since last heartbeat  
✅ **Error Handling**: Shows appropriate messages for connection issues  
✅ **Mobile Responsive**: Works on all device sizes  
✅ **Accessibility**: Proper ARIA labels and keyboard navigation  
✅ **Performance**: Efficient queries with minimal data transfer  

## 🔗 Related Files

- **Component**: [`src/components/HeartbeatStatus.tsx`](src/components/HeartbeatStatus.tsx:1)
- **Service**: [`src/services/supabaseService.ts`](src/services/supabaseService.ts:1) (with `updateHeartbeat` function)
- **Types**: [`src/types/index.ts`](src/types/index.ts:1) (with `last_heartbeat_at` field)
- **Migration**: [`supabase/migrations/20251216000001_add_heartbeat_field_to_settings.sql`](supabase/migrations/20251216000001_add_heartbeat_field_to_settings.sql:1)

## 💡 Pro Tips

1. **Cache Settings**: Store heartbeat status in React state to avoid unnecessary database queries
2. **Batch Updates**: Consider batching multiple settings updates to reduce API calls
3. **Progressive Enhancement**: Start with basic display, then add advanced features
4. **User Preferences**: Remember user's preferred time zone and date format
5. **Performance Monitoring**: Track heartbeat execution time and success rate
6. **Error Recovery**: Implement retry logic for failed heartbeat checks

---

This integration provides a complete solution for monitoring your Supabase heartbeat system directly from your frontend, giving you immediate visibility into the system's health and activity status.