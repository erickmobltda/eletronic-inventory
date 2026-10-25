// Firestore documents under apps/inventory/users/{uid}/... The document id is
// the component / project id (a slug such as "esp32-devkit").

export type Link = { label: string; url: string };

export type Component = {
  id: string;
  name: string;
  category: string;
  quantity: number | null; // null = count unknown
  voltage: string;
  interfaces: string[];
  description: string;
  specs: Record<string, string>;
  links: Link[];
  notes: string;
  source: string;
  created_at?: string;
  updated_at?: string;
};

export type ProjectStatus = 'active' | 'planned' | 'archived';

export type Allocation = { id: string; qty: number };

export type Project = {
  id: string;
  name: string;
  status: ProjectStatus;
  description: string;
  repo: string;
  components: Allocation[];
  created_at?: string;
  updated_at?: string;
};

export type ComponentStatus = 'free' | 'partial' | 'in-use' | 'reserved';

export type DerivedComponent = Component & {
  used: number;
  reserved: number;
  free: number | null;
  status: ComponentStatus;
  allocations: { project: Project; qty: number }[];
  haystack: string;
};
