import { useEffect, useState } from "react";
import { EXPORTABLE, fetchDataset, downloadOne, downloadAll } from "@/lib/exportData";
import { logAudit } from "@/lib/audit";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileDown, Loader2 } from "lucide-react";

export default function ExportData() {
  const { toast } = useToast();
  const [counts, setCounts] = useState({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [busy, setBusy] = useState(null); // "all" | dataset key

  useEffect(() => {
    (async () => {
      const map = {};
      await Promise.all(
        EXPORTABLE.map(async (def) => {
          try {
            const rows = await fetchDataset(def);
            map[def.key] = rows.length;
          } catch {
            map[def.key] = 0;
          }
        })
      );
      setCounts(map);
      setLoadingCounts(false);
    })();
  }, []);

  const handleOne = async (def) => {
    setBusy(def.key);
    try {
      const count = await downloadOne(def);
      await logAudit("data_export", `${def.label} (${count} records)`);
      toast({ title: "Export ready", description: `${count} record${count === 1 ? "" : "s"} exported.` });
    } catch (e) {
      toast({ title: "Export failed", description: e.message || "Please try again." });
    } finally {
      setBusy(null);
    }
  };

  const handleAll = async () => {
    setBusy("all");
    try {
      const total = await downloadAll();
      await logAudit("data_export", `all datasets (${total} records)`);
      toast({ title: "Export ready", description: `${total} record${total === 1 ? "" : "s"} exported across all datasets.` });
    } catch (e) {
      toast({ title: "Export failed", description: e.message || "Please try again." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Download your work</h1>
        <p className="text-brand-mutedtext text-sm mt-1">
          Everything you've built in this app — the markets you scored, the deals you ran, the landlords you contacted — is yours. Take it with you whenever you want.
        </p>
      </div>

      <Button
        onClick={handleAll}
        disabled={busy !== null}
        className="w-full bg-brand-gold text-brand-ink hover:bg-brand-gold/90 h-12 text-base"
      >
        {busy === "all" ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Download className="w-5 h-5 mr-2" />}
        {busy === "all" ? "Preparing…" : "Download everything (JSON)"}
      </Button>

      <div className="space-y-2">
        {EXPORTABLE.map((def) => {
          const count = counts[def.key];
          const empty = !loadingCounts && count === 0;
          const isBusy = busy === def.key;
          return (
            <Card key={def.key} className="border-brand-line">
              <CardContent className="py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-brand-text">{def.label}</div>
                  <div className="text-xs text-brand-mutedtext">{def.describe}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-brand-mutedtext w-20 text-right">
                    {loadingCounts ? "…" : empty ? "nothing yet" : `${count} record${count === 1 ? "" : "s"}`}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-brand-line text-brand-text"
                    disabled={busy !== null || empty}
                    onClick={() => handleOne(def)}
                  >
                    {isBusy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileDown className="w-4 h-4 mr-1" />}
                    CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-sm text-brand-mutedtext leading-relaxed">
        This includes your markets, deals, landlords, outreach and progress. It does not include the Nurse Net AED curriculum, templates, scripts or coaching content — those stay in the app under the Terms.
      </p>
    </div>
  );
}