import * as React from 'react';
import { Check, ChevronDown, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  multiple?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  renderOption?: (option: SelectOption) => React.ReactNode;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchable = false,
  multiple = false,
  disabled = false,
  error,
  className,
  renderOption,
}: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const selectedValues = React.useMemo(() => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }, [value]);

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        opt.description?.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  const selectedLabels = React.useMemo(() => {
    return selectedValues
      .map((v) => options.find((opt) => opt.value === v)?.label)
      .filter(Boolean)
      .join(', ');
  }, [selectedValues, options]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) setSearchQuery('');
    }
  };

  const handleSelect = (optionValue: string) => {
    if (multiple) {
      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter((v) => v !== optionValue)
        : [...selectedValues, optionValue];
      onChange?.(newValues);
    } else {
      onChange?.(optionValue);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(multiple ? [] : '');
  };

  const handleRemoveValue = (valueToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (multiple) {
      onChange?.(selectedValues.filter((v) => v !== valueToRemove));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
        break;
      case 'Enter':
      case ' ':
        if (!isOpen) {
          e.preventDefault();
          setIsOpen(true);
          setHighlightedIndex(0);
        } else if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          e.preventDefault();
          handleSelect(filteredOptions[highlightedIndex].value);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(0);
        } else {
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(filteredOptions.length - 1);
        } else {
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
        }
        break;
      case 'Home':
        if (isOpen) {
          e.preventDefault();
          setHighlightedIndex(0);
        }
        break;
      case 'End':
        if (isOpen) {
          e.preventDefault();
          setHighlightedIndex(filteredOptions.length - 1);
        }
        break;
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        className={cn(
          `flex min-h-10 w-full cursor-pointer items-center justify-between rounded-md border
           bg-surface px-3 py-2 text-body transition-colors
           hover:border-sage/50
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-focus`,
          disabled && 'cursor-not-allowed opacity-50',
          error && 'border-error focus-visible:ring-error',
          isOpen && 'ring-2 ring-teal-focus'
        )}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
      >
        <div className="flex flex-1 flex-wrap gap-1">
          {multiple && selectedValues.length > 0 ? (
            selectedValues.map((v) => {
              const option = options.find((opt) => opt.value === v);
              return (
                <span
                  key={v}
                  className="inline-flex items-center gap-1 rounded bg-sage-pale px-2 py-0.5 text-body-sm"
                >
                  {option?.label}
                  <button
                    type="button"
                    aria-label={`Remove ${option?.label}`}
                    className="flex items-center justify-center hover:text-error focus:outline-none focus:ring-1 focus:ring-teal-focus rounded"
                    onClick={(e) => handleRemoveValue(v, e)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })
          ) : selectedLabels ? (
            <span className="truncate">{selectedLabels}</span>
          ) : (
            <span className="text-[var(--color-text-tertiary)]">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {selectedValues.length > 0 && !disabled && (
            <button
              type="button"
              aria-label="Clear selection"
              className="flex items-center justify-center min-h-6 min-w-6 text-[var(--color-text-tertiary)] hover:text-charcoal focus:outline-none focus:ring-1 focus:ring-teal-focus rounded"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-[var(--color-text-tertiary)] transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </div>

      {isOpen && (
        <div
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-surface
                     shadow-elevation-2 animate-fade-in"
        >
          {searchable && (
            <div className="sticky top-0 border-b bg-surface p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full rounded border-none bg-elevated py-1.5 pl-8 pr-3 text-body-sm
                           focus:outline-none focus:ring-1 focus:ring-teal-focus"
                />
              </div>
            </div>
          )}
          <ul role="listbox" className="py-1">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-body-sm text-[var(--color-text-tertiary)]">
                No options found
              </li>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = selectedValues.includes(option.value);
                const isHighlighted = index === highlightedIndex;
                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled}
                    className={cn(
                      `flex cursor-pointer items-center gap-2 px-3 py-2 text-body`,
                      isHighlighted && 'bg-elevated',
                      isSelected && !isHighlighted && 'bg-sage-pale',
                      isSelected && isHighlighted && 'bg-sage-pale',
                      !isSelected && !isHighlighted && 'hover:bg-elevated',
                      option.disabled && 'cursor-not-allowed opacity-50'
                    )}
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    {multiple && (
                      <div
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                          isSelected && 'border-sage bg-sage'
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    )}
                    {renderOption ? (
                      renderOption(option)
                    ) : (
                      <div className="flex flex-1 items-center gap-2">
                        {option.icon}
                        <div>
                          <div>{option.label}</div>
                          {option.description && (
                            <div className="text-body-sm text-[var(--color-text-secondary)]">
                              {option.description}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {!multiple && isSelected && (
                      <Check className="h-4 w-4 shrink-0 text-sage" />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {error && <p className="mt-1.5 text-caption text-error">{error}</p>}
    </div>
  );
}
