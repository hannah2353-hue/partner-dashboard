"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DiffChange {
  fieldLabel: string;
  oldValue: string;
  newValue: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelName: string;
  changes: DiffChange[];
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function DiffConfirmModal({
  open,
  onOpenChange,
  channelName,
  changes,
  onConfirm,
  onCancel,
  loading,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>변경 확인</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{channelName}</span>의
            다음 정보를 변경합니다.
          </p>
          <div className="space-y-3">
            {changes.map((change, i) => (
              <div
                key={i}
                className="rounded-lg border border-border p-3 bg-gray-50"
              >
                <p className="text-xs text-muted-foreground mb-2 font-medium">
                  {change.fieldLabel}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-red-500 line-through">
                    {change.oldValue || "-"}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-green-600 font-medium">
                    {change.newValue}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            취소
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="bg-accent-red hover:bg-accent-red/90 text-white"
          >
            {loading ? "저장 중..." : "확인"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { DiffChange };
