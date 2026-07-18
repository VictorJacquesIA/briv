import Image from "next/image";

import { cn } from "@/utils/cn";

type BrandLogoProps = {
  className?: string;
  size?: "compact" | "default" | "large";
};

export function BrandLogo({ className, size = "default" }: BrandLogoProps) {
  const logoSizeClass =
    size === "compact"
      ? "h-10 w-16"
      : size === "large"
        ? "h-28 w-56"
        : "h-12 w-28";

  const logoSizes =
    size === "compact" ? "64px" : size === "large" ? "224px" : "112px";

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className={cn("relative overflow-hidden", logoSizeClass)}>
        <Image
          src="/una_logo.png"
          alt="UNA Compras"
          fill
          sizes={logoSizes}
          className="object-contain"
          priority
        />
      </div>
    </div>
  );
}
