import React from "react";
import Card from "./Card";
import Button from "./Button";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}) {
  return (
    <Card padding="lg" className="flex flex-col items-center justify-center text-center py-16">
      {Icon && (
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "var(--surface-soft)" }}
        >
          <Icon style={{ width: 32, height: 32, color: "var(--muted)" }} />
        </div>
      )}
      <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text)" }}>
        {title}
      </h3>
      {description && (
        <p className="text-sm max-w-sm mx-auto mb-6" style={{ color: "var(--muted)" }}>
          {description}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {primaryAction && (
          <Button
            variant="primary"
            icon={primaryAction.icon}
            onClick={primaryAction.onClick}
          >
            {primaryAction.label}
          </Button>
        )}
        {secondaryAction && (
          <Button
            variant="ghost"
            icon={secondaryAction.icon}
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </Card>
  );
}
