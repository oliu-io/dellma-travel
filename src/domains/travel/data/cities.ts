import type { City } from "../types";

// Suggested destinations — lightweight, no hardcoded state assumptions.
// The Scout agent will infer context; the Forecaster will enumerate latent factors.
export const SUGGESTED_CITIES: City[] = [
  {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    icon: "cherry",
    imageUrl:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80",
  },
  {
    id: "barcelona",
    name: "Barcelona",
    country: "Spain",
    icon: "sun",
    imageUrl:
      "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600&q=80",
  },
  {
    id: "reykjavik",
    name: "Reykjavik",
    country: "Iceland",
    icon: "mountain-snow",
    imageUrl:
      "https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=600&q=80",
  },
  {
    id: "marrakech",
    name: "Marrakech",
    country: "Morocco",
    icon: "lamp",
    imageUrl:
      "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=600&q=80",
  },
  {
    id: "banff",
    name: "Banff",
    country: "Canada",
    icon: "trees",
    imageUrl:
      "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=600&q=80",
  },
  {
    id: "paris",
    name: "Paris",
    country: "France",
    icon: "landmark",
    imageUrl:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80",
  },
  {
    id: "bali",
    name: "Bali",
    country: "Indonesia",
    icon: "palm-tree",
    imageUrl:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80",
  },
  {
    id: "new-york",
    name: "New York",
    country: "USA",
    icon: "building",
    imageUrl:
      "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&q=80",
  },
];

// Default image for user-added cities
export const DEFAULT_CITY_IMAGE =
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&q=80";
