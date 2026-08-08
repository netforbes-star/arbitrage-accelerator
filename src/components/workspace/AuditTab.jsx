import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "./WorkspaceShared";

export default function AuditTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const l = await base44.entities.AuditLog.list("-created_date", 100);
        setLogs(l);
      } catch (e) {
        console.error("Audit load failed", e);
        setLogs([]);
      }
      setLoading(false);
    })();
  }, []);
  if (loading) return <Spinner />;
  return (
    <Card className="border-brand-line">
      <CardHeader><CardTitle className="text-brand-text text-lg">Audit Log (append-only)</CardTitle></CardHeader>
      <CardContent className="space-y-1.5">
        {logs.length === 0 && <p className="text-sm text-brand-mutedtext">No audit entries yet.</p>}
        {logs.map((l) => (
          <div key={l.id} className="flex items-start gap-3 text-sm border-b border-brand-line py-1.5 last:border-0">
            <Badge variant="outline" className="text-xs shrink-0 border-brand-line text-brand-mutedtext">{l.action}</Badge>
            <div className="min-w-0">
              <span className="text-brand-text">{l.actor_email}</span>
              <span className="text-brand-mutedtext"> · {l.details}</span>
              {l.target_user_email && <span className="text-xs text-brand-mutedtext"> → {l.target_user_email}</span>}
              <div className="text-xs text-brand-mutedtext">{l.created_date?.slice(0, 16).replace("T", " ")}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}