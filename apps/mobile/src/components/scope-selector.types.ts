export interface ScopeOption {
  readonly id: string;
  readonly label: string;
}

export interface ScopeSelectorProps {
  readonly onSelectionChange: (value: string) => void;
  readonly options: readonly ScopeOption[];
  readonly selection: string;
}
