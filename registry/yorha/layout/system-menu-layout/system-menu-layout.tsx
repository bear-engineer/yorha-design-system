import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { MenuList, MenuListItem } from "@/components/ui/menu-list";
import { Panel } from "@/components/ui/panel";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { Split } from "@/components/split";
import { cn } from "@/lib/utils";

export interface SystemMenuItem {
  id: string;
  label: string;
  /** Secondary text in the list row. */
  description?: ReactNode;
  disabled?: boolean;
  /** Body of the detail panel while this row is selected. */
  content: ReactNode;
}

export interface SystemMenuSection {
  id: string;
  label: string;
  items: SystemMenuItem[];
}

export interface SystemMenuLayoutProps {
  sections: SystemMenuSection[];
  /** Controlled section id. Map it to a route (derive from the location, navigate in onValueChange). */
  value?: string;
  defaultValue?: string;
  onValueChange?: (sectionId: string) => void;
  /** Accessible name of the tab strip. */
  label?: string;
  className?: string;
}

const firstEnabled = (section: SystemMenuSection) => section.items.find((item) => !item.disabled)?.id ?? null;

/**
 * Pause-menu screen: tabs for the primary sections, a menu list on the left, a detail panel on the right.
 * Router-agnostic. Keyboard path: Tab -> tab strip, Tab -> list, Enter on a row -> detail panel (focusable, not a tab stop), Esc in the panel -> back to the list row (v4).
 */
export function SystemMenuLayout({
  sections,
  value,
  defaultValue,
  onValueChange,
  label = "시스템 메뉴",
  className,
}: SystemMenuLayoutProps) {
  const [picked, setPicked] = useState<Record<string, string | null>>({});
  const tabsProps = {
    ...(value !== undefined ? { value } : { defaultValue: defaultValue ?? sections[0]?.id }),
    onValueChange: (next: unknown) => onValueChange?.(String(next)),
  };

  return (
    <Tabs {...tabsProps} data-slot="system-menu-layout" className={cn("flex w-full min-w-0 flex-col", className)}>
      <TabsList aria-label={label}>
        {sections.map((section) => (
          <TabsTab key={section.id} value={section.id}>
            {section.label}
          </TabsTab>
        ))}
      </TabsList>
      {sections.map((section) => (
        <TabsPanel key={section.id} value={section.id} tabIndex={-1}>
          <SectionBody
            section={section}
            itemId={picked[section.id] ?? firstEnabled(section)}
            onItemChange={(id) => setPicked((prev) => ({ ...prev, [section.id]: id }))}
          />
        </TabsPanel>
      ))}
    </Tabs>
  );
}

function SectionBody({
  section,
  itemId,
  onItemChange,
}: {
  section: SystemMenuSection;
  itemId: string | null;
  onItemChange: (id: string) => void;
}) {
  const item = section.items.find((candidate) => candidate.id === itemId) ?? null;
  const detail = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  // Esc in the detail panel hands focus back to the selected row of the list.
  const backToList = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    const row = list.current?.querySelector<HTMLElement>("[data-selected]") ?? list.current?.querySelector<HTMLElement>("[tabindex='0']");
    if (!row) return;
    event.preventDefault();
    event.stopPropagation();
    row.focus();
  };

  return (
    <Split
      divider={false}
      list={
        <div ref={list}>
        <MenuList
          aria-label={`${section.label} 목록`}
          value={itemId}
          onValueChange={onItemChange}
          onActivate={() => detail.current?.querySelector<HTMLElement>("[data-slot=system-menu-panel]")?.focus()}
        >
          {section.items.map((entry) => (
            <MenuListItem key={entry.id} value={entry.id} disabled={entry.disabled} description={entry.description}>
              {entry.label}
            </MenuListItem>
          ))}
        </MenuList>
        </div>
      }
      detail={
        <div
          ref={detail}
          data-slot="system-menu-detail"
          onKeyDown={backToList}
        >
          {item && (
            <Panel
              data-slot="system-menu-panel"
              title={item.label}
              titleLevel={2}
              tabIndex={-1}
              className="focus-visible:yorha-focus"
            >
              {item.content}
            </Panel>
          )}
        </div>
      }
    />
  );
}
