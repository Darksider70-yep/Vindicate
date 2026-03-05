import { X } from "lucide-react";

const toastTypes = {
  success: {
    icon: "✅",
    barClass: "bg-success",
  },
  danger: {
    icon: "❌",
    barClass: "bg-danger",
  },
  warning: {
    icon: "⚠️",
    barClass: "bg-warning",
  },
};

export default function Toast({ type = "success", message, onClose }) {
  const { icon, barClass } = toastTypes[type];

  return (
    <div className="surface-card mb-3 flex w-80 max-w-sm items-start overflow-hidden shadow-soft">
      <div className={`w-1.5 self-stretch ${barClass}`} />
      <div className="mr-3 pt-3 pl-3 text-xl">{icon}</div>
      <div className="flex-grow py-3">
        <p className="font-semibold">{message}</p>
      </div>
      <button onClick={onClose} className="p-3 text-muted hover:text-text">
        <X size={20} />
      </button>
    </div>
  );
}
