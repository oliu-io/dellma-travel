"use client";

import {
  Cherry,
  Sun,
  MountainSnow,
  Lamp,
  Trees,
  Landmark,
  Palmtree,
  Building,
  MapPin,
  Globe,
  type LucideIcon,
} from "lucide-react";

/** Map from City.icon string → Lucide component */
const ICON_MAP: Record<string, LucideIcon> = {
  cherry: Cherry,
  sun: Sun,
  "mountain-snow": MountainSnow,
  lamp: Lamp,
  trees: Trees,
  landmark: Landmark,
  "palm-tree": Palmtree,
  building: Building,
  "map-pin": MapPin,
  globe: Globe,
};

interface CityIconProps {
  icon: string;
  className?: string;
  strokeWidth?: number;
}

/**
 * Renders a Lucide icon for a city based on its `icon` string.
 * Falls back to MapPin for unknown icon names (e.g. custom user-added cities).
 */
export function CityIcon({ icon, className = "w-4 h-4", strokeWidth = 1.8 }: CityIconProps) {
  const IconComponent = ICON_MAP[icon] ?? MapPin;
  return <IconComponent className={className} strokeWidth={strokeWidth} />;
}
