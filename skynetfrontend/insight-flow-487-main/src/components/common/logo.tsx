import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-12 w-12",
  };

  return (
    <div className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-black p-1 shadow-md ring-2 ring-primary/30 border border-white/20", sizeClasses[size], className)}>
      <img
        src="/logo.png"
        alt="SKYNET Warrior Emblem"
        className="h-full w-full rounded-full object-cover filter invert dark:invert-0 brightness-110"
        onError={(e) => {
          // Fallback if image fails to load
          e.currentTarget.style.display = 'none';
        }}
      />
    </div>
  );
}
