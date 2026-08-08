import { Card, CardContent } from "@/components/ui/card";

export function Stat({ label, value }) {
  return (
    <Card className="border-brand-line">
      <CardContent className="py-4">
        <div className="text-2xl font-bold text-brand-text">{value}</div>
        <div className="text-xs text-brand-mutedtext">{label}</div>
      </CardContent>
    </Card>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="w-8 h-8 border-4 border-brand-line border-t-brand-gold rounded-full animate-spin" />
    </div>
  );
}