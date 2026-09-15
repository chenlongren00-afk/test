export const taskCategories = [
  "Accountants",
  "Admin",
  "Alterations",
  "APP / WEB design",
  "Appliances",
  "Auto Electricians",
  "Beauticians",
  "Bicycle Service",
  "Bricklaying",
  "Building & Construction",
  "Campanionship",
  "Car Body Work",
  "Car Detailing",
  "Car Repair",
  "Car Service",
  "Carpentry",
  "Catering",
  "Cleaning",
  "Computers & IT",
  "Decking",
  "Delivery",
  "Design",
  "Driving",
  "Electricians",
  "Entertainment / Event",
  "EV Charger",
  "Fencing",
  "Flooring",
  "Furniture Assembly",
  "Gardening",
  "Gate Installation",
  "Handyman",
  "Heating & Cooling",
  "Home Automation And Security",
  "Home Theatre",
  "Interpreter",
  "Leather Care",
  "Laundry",
  "Lessons",
  "Locksmith",
  "Lost & Found",
  "Marketing",
  "Mobile Mechanic",
  "Others",
  "Painting",
  "Pest Control",
  "Pet help",
  "Photographers",
  "Plasterer",
  "Plumbing",
  "Pool Maintenance",
  "Removals",
  "Roadside Assist",
  "Roofing",
  "Solar power",
  "Staffing",
  "Tattoo Artists",
  "Tiling",
  "Tradesman",
  "Tutoring",
  "Wall Hanging & Mounting",
  "Wallpapering",
  "Waterproofing",
  "Wheel & Tyre Service",
  "Window and Door",
  "Writing"
];

export function mergeCategories(remoteCategories?: string[]) {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const item of [...taskCategories, ...(remoteCategories || [])]) {
    const normalized = item.trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    merged.push(normalized);
  }

  return merged.sort((a, b) => a.localeCompare(b));
}
