

export type PMViewType = 'overview' | 'registry' | 'sections' | 'rbac' | 'slas' | 'dictionary' | 'changelog' | 'work_items';

// Matches Sheet: Registry
export interface RegistryItem {
  type: string;
  id: string;
  name: string;
  urlAlias: string;
  moduleID: string;
  parentID: string;
  ownerPod: string;
  businessUnits: string; // Comma separated in sheet
  status: 'Backlog' | 'In Progress' | 'Review' | 'Ready' | 'Shipped' | 'Active' | 'Deprecating' | 'Beta' | string;
  version: string;
}

// Matches Sheet: Sections
export interface SectionConfig {
  sectionID: string;
  entities: string; // Comma separated
  visibleControls: string; // Comma separated
  actions: string; // Comma separated
  pagination: string;
  owner: string;
  status: 'Live' | 'Draft' | string;
  version: string;
  routes: string; // "routes[]" in sheet
  note: string;
}

// Matches Sheet: role-to-scope
export interface RoleScope {
  role: string;
  scopeRefs: string;
  grants: string;
  notes: string;
  version: string;
}

// Matches Sheet: SLAs
export interface SLAConfig {
  slaID: string;
  moduleID: string;
  sectionID: string;
  kpi: string;
  target: string;
  alertThreshold: string;
  playbook: string;
  owner: string;
  version: string;
}

// Matches Sheet: Data Dictionary
export interface DictionaryItem {
  entityID: string;
  field: string;
  type: string;
  required: string;
  enumConstraints: string; // "enum/constraints"
  source: string;
  version: string;
}

// Matches Sheet: Changelog
export interface ChangeLogEntry {
  date: string;
  specVersion: string;
  rowsChanged: string;
  summary: string;
  owners: string;
  PR: string;
}

export interface WorkItem {
  id: string;
  title: string;
  linkedSectionId: string;
  status: 'Backlog' | 'In Progress' | 'Review' | 'Ready' | 'Shipped';
  owner: string;
  due: string;
  prLink?: string;
}

// --- Empty Defaults for Initial State ---
export const DEFAULT_PM_DATA = {
    registry: [] as RegistryItem[],
    sections: [] as SectionConfig[],
    roles: [] as RoleScope[],
    slas: [] as SLAConfig[],
    dictionary: [] as DictionaryItem[],
    changelog: [] as ChangeLogEntry[]
};

export const MOCK_WORK_ITEMS: WorkItem[] = [
  { id: 'WI-101', title: 'Implement new Order filters', linkedSectionId: 'SEC-ORDERS', status: 'In Progress', owner: 'Dev Team', due: 'Oct 24' },
  { id: 'WI-102', title: 'Fix sorting bug in Inventory', linkedSectionId: 'SEC-INVENTORY', status: 'Backlog', owner: 'Dev Team', due: 'Oct 28' },
  { id: 'WI-103', title: 'Update RBAC for Managers', linkedSectionId: 'SEC-ADMIN', status: 'Review', owner: 'Dev Team', due: 'Oct 22', prLink: '#123' },
];