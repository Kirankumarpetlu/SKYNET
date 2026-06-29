import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/api";

interface SyncStatus {
  notion_configured: boolean;
  statistics: {
    synced: number;
    failed: number;
    pending: number;
    total: number;
  };
  pending_sync_count: number;
  failed_syncs: Array<{
    document_id: string;
    document_name: string;
    error: string;
    last_attempt: string;
    retry_count: number;
  }>;
  health: {
    syncing: boolean;
    message: string;
  };
}

export function SyncStatusPanel() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = async () => {
    try {
      setRefreshing(true);
      const res = await fetch(`${API_BASE_URL}/sync-status`);

      if (!res.ok) throw new Error("Failed to fetch sync status");
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      toast.error("Failed to fetch sync status", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 animate-spin" />
            Notion Sync Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            Sync Status Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Unable to fetch sync status</p>
        </CardContent>
      </Card>
    );
  }

  const totalSynced = status.statistics.synced;
  const totalFailed = status.statistics.failed;
  const syncPercentage = status.statistics.total > 0 
    ? Math.round((totalSynced / status.statistics.total) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            {status.health.syncing ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            )}
            Notion Sync Status
          </CardTitle>
          <CardDescription className="mt-1">{status.health.message}</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStatus}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Configuration Status */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Configuration</h4>
          <div className="flex items-center gap-2">
            {status.notion_configured ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">Notion Token Configured</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-600">Notion Token Missing</span>
              </>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Sync Statistics</h4>
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold">{status.statistics.total}</p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-xs text-green-700">Synced</p>
              <p className="text-xl font-bold text-green-700">{status.statistics.synced}</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-xs text-red-700">Failed</p>
              <p className="text-xl font-bold text-red-700">{status.statistics.failed}</p>
            </div>
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <p className="text-xs text-yellow-700">Pending</p>
              <p className="text-xl font-bold text-yellow-700">{status.statistics.pending}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Success Rate</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${syncPercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{syncPercentage}% successful</p>
          </div>
        </div>

        {/* Pending Sync Info */}
        {status.pending_sync_count > 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <p className="text-sm font-semibold text-yellow-900">
              {status.pending_sync_count} document{status.pending_sync_count !== 1 ? "s" : ""} waiting to sync
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Completed documents will sync when triggered
            </p>
          </div>
        )}

        {/* Failed Syncs */}
        {status.failed_syncs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-red-600">Failed Sync Attempts</h4>
            <div className="space-y-2">
              {status.failed_syncs.map((sync) => (
                <div key={sync.document_id} className="rounded border border-red-200 bg-red-50 p-2">
                  <p className="text-sm font-medium text-red-900">{sync.document_name}</p>
                  <p className="text-xs text-red-700 mt-1">{sync.error}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-red-600">
                      Attempt {sync.retry_count + 1} • {sync.last_attempt ? new Date(sync.last_attempt).toLocaleString() : "N/A"}
                    </span>
                    <Badge variant="destructive" className="text-xs">Failed</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
