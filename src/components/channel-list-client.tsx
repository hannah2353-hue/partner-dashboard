"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronRight, Plus, Search } from "lucide-react";
import { AddChannelModal } from "@/components/add-channel-modal";
import type { Alert } from "@/lib/types";

interface ProductRow {
  product: string;
  commission_rate: string;
  commission_vat: string;
  compliance_number: string;
  compliance_expiry: string;
  compliance_remaining_days: number | null;
}

interface ChannelRow {
  channel_code: string;
  channel_type: "비교대출" | "광고배너";
  service_name: string;
  company_name: string;
  active_products: string[];
  remaining_days: number;
  alert_level: "CRITICAL" | "WARNING" | null;
  products: ProductRow[];
  alerts: Alert[];
}

interface ChannelListClientProps {
  channels: ChannelRow[];
  counts: {
    total: number;
    비교대출: number;
    광고배너: number;
  };
}

export function ChannelListClient({
  channels,
  counts,
}: ChannelListClientProps) {
  const [filter, setFilter] = useState<"전체" | "비교대출" | "광고배너">("전체");
  const [search, setSearch] = useState("");
  const router = useRouter();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => {
    // Auto-expand CRITICAL rows
    const critical = new Set<string>();
    channels.forEach((ch) => {
      if (ch.alert_level === "CRITICAL") critical.add(ch.channel_code);
    });
    return critical;
  });

  const filtered = channels.filter((ch) => {
    if (filter !== "전체" && ch.channel_type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        ch.service_name.toLowerCase().includes(q) ||
        ch.company_name.toLowerCase().includes(q) ||
        ch.channel_code.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Sort: CRITICAL first, WARNING next, then by remaining_days
  const sorted = [...filtered].sort((a, b) => {
    const levelOrder = (l: string | null) =>
      l === "CRITICAL" ? 0 : l === "WARNING" ? 1 : 2;
    const diff = levelOrder(a.alert_level) - levelOrder(b.alert_level);
    if (diff !== 0) return diff;
    return a.remaining_days - b.remaining_days;
  });

  const toggleRow = (code: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-heading text-foreground">
          채널 목록
        </h1>
        <Button
          className="bg-foreground text-white hover:bg-foreground/90 gap-1.5"
          onClick={() => setAddModalOpen(true)}
        >
          <Plus size={16} />
          채널 추가
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-4">
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as typeof filter)}
        >
          <TabsList className="bg-gray-100">
            <TabsTrigger value="전체" className="text-sm">
              전체{" "}
              <span className="ml-1 text-muted-custom">{counts.total}</span>
            </TabsTrigger>
            <TabsTrigger value="비교대출" className="text-sm">
              비교대출{" "}
              <span className="ml-1 text-muted-custom">{counts.비교대출}</span>
            </TabsTrigger>
            <TabsTrigger value="광고배너" className="text-sm">
              광고배너{" "}
              <span className="ml-1 text-muted-custom">{counts.광고배너}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-64">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-custom"
          />
          <Input
            placeholder="채널 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-border-custom"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border border-border-custom rounded-lg bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <TableHead className="w-10"></TableHead>
              <TableHead className="font-semibold text-foreground">
                서비스명
              </TableHead>
              <TableHead className="font-semibold text-foreground">
                유형
              </TableHead>
              <TableHead className="font-semibold text-foreground">
                취급상품
              </TableHead>
              <TableHead className="font-semibold text-foreground text-right">
                계약잔여일
              </TableHead>
              <TableHead className="font-semibold text-foreground text-center">
                경고
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((ch) => {
              const isExpanded = expandedRows.has(ch.channel_code);
              const rowBg =
                ch.alert_level === "CRITICAL"
                  ? "bg-red-50/40"
                  : ch.alert_level === "WARNING"
                    ? "bg-yellow-50/40"
                    : "";

              return (
                <ChannelTableRow
                  key={ch.channel_code}
                  channel={ch}
                  isExpanded={isExpanded}
                  rowBg={rowBg}
                  onToggle={() => toggleRow(ch.channel_code)}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AddChannelModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}

function ChannelTableRow({
  channel: ch,
  isExpanded,
  rowBg,
  onToggle,
}: {
  channel: ChannelRow & { products: ProductRow[] };
  isExpanded: boolean;
  rowBg: string;
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow className={`${rowBg} hover:bg-gray-50/80 cursor-pointer`} onClick={onToggle}>
        <TableCell className="w-10 pl-4">
          <button className="p-0.5">
            {isExpanded ? (
              <ChevronDown size={14} className="text-muted-custom" />
            ) : (
              <ChevronRight size={14} className="text-muted-custom" />
            )}
          </button>
        </TableCell>
        <TableCell>
          <Link
            href={`/channels/${encodeURIComponent(ch.channel_code)}`}
            className="font-medium text-foreground hover:text-accent-red transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {ch.service_name}
          </Link>
          <p className="text-xs text-muted-custom">{ch.company_name}</p>
        </TableCell>
        <TableCell>
          <Badge
            variant="outline"
            className={`text-xs ${
              ch.channel_type === "비교대출"
                ? "border-blue-200 text-blue-700 bg-blue-50"
                : "border-purple-200 text-purple-700 bg-purple-50"
            }`}
          >
            {ch.channel_type}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1">
            {ch.active_products.map((p) => (
              <span
                key={p}
                className="text-xs bg-gray-100 px-2 py-0.5 rounded"
              >
                {p}
              </span>
            ))}
          </div>
        </TableCell>
        <TableCell className="text-right">
          <span
            className={`font-mono text-sm font-semibold ${
              ch.remaining_days <= 30
                ? "text-critical"
                : ch.remaining_days <= 90
                  ? "text-warning"
                  : "text-foreground"
            }`}
          >
            {ch.remaining_days}일
          </span>
        </TableCell>
        <TableCell className="text-center">
          {ch.alert_level && (
            <Badge
              className={`text-[10px] px-1.5 py-0 font-semibold ${
                ch.alert_level === "CRITICAL"
                  ? "bg-critical text-white"
                  : "bg-warning text-foreground"
              }`}
            >
              {ch.alert_level}
            </Badge>
          )}
        </TableCell>
      </TableRow>

      {/* Expanded product rows */}
      {isExpanded &&
        ch.products.map((p) => (
          <TableRow
            key={`${ch.channel_code}-${p.product}`}
            className="bg-gray-50/30"
          >
            <TableCell></TableCell>
            <TableCell colSpan={2} className="pl-8">
              <span className="text-sm text-muted-custom">
                {p.product}
              </span>
            </TableCell>
            <TableCell>
              <span className="text-xs text-muted-custom">
                수수료 {p.commission_rate} ({p.commission_vat})
              </span>
            </TableCell>
            <TableCell className="text-right">
              <span className="text-xs text-muted-custom">
                {p.compliance_number !== "-"
                  ? p.compliance_number
                  : "심의없음"}
              </span>
            </TableCell>
            <TableCell className="text-center">
              {p.compliance_expiry !== "-" && (
                <span
                  className={`text-xs ${
                    p.compliance_remaining_days !== null &&
                    p.compliance_remaining_days < 0
                      ? "text-critical font-semibold"
                      : p.compliance_remaining_days !== null &&
                          p.compliance_remaining_days <= 30
                        ? "text-warning font-semibold"
                        : "text-muted-custom"
                  }`}
                >
                  {p.compliance_expiry}
                </span>
              )}
            </TableCell>
          </TableRow>
        ))}
    </>
  );
}
