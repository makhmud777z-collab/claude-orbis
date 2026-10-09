"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  addDepartmentAction, moveEmployeeAction, removeDepartmentAction,
  renameDepartmentAction, setDepartmentHeadAction, unassignEmployeeAction,
} from "@/app/actions";
import { Modal, Select, Tooltip } from "./controls";
import { IconChevron, IconClose, IconPencil, IconPlus, IconSearch, IconTrash } from "./icons";
import { Avatar } from "./ui";
import { translator, type Locale } from "@/lib/i18n";
import { formatters } from "@/lib/format";
import { P, S } from "@/lib/strings";

export interface StructurePerson {
  id: string;
  name: string;
  title: string;
  departmentId: string | null;
}

export interface StructureNode {
  id: string;
  name: string;
  parentId: string | null;
  headId: string | null;
  /** сотрудники самого подразделения, без вложенных */
  memberIds: string[];
  /** сотрудники подразделения и всех вложенных — цифра на карточке */
  totalIds: string[];
}

/**
 * Структура компании.
 *
 * Схема слева и панель подразделения справа — как в портале: на схеме видно
 * форму компании, в панели — кто в подразделении и кто им руководит.
 * Схему можно менять прямо здесь: добавить отдел, назначить руководителя,
 * перетащить сотрудника в другое подразделение.
 */
export function CompanyStructure({
  nodes,
  people,
  locale,
  canEdit,
  currentUserId,
  companyName,
  companyMark,
}: {
  nodes: StructureNode[];
  people: StructurePerson[];
  locale: Locale;
  canEdit: boolean;
  currentUserId: string;
  companyName: string;
  companyMark: string;
}) {
  const t = translator(locale);
  const f = formatters(locale);
  const byId = new Map(people.map((p) => [p.id, p]));
  const roots = nodes.filter((n) => !n.parentId);

  const [openId, setOpenId] = useState(roots[0]?.id ?? nodes[0]?.id ?? "");
  const [zoom, setZoom] = useState(90);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<StructureNode | null>(null);
  const [removing, setRemoving] = useState<StructureNode | null>(null);
  const [addingPerson, setAddingPerson] = useState<StructureNode | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const canvas = useRef<HTMLDivElement>(null);

  // Дерево шире экрана, а смотреть на него начинают с корня: ставим прокрутку
  // по центру схемы, иначе первый кадр показывает случайную ветку.
  useEffect(() => {
    const box = canvas.current;
    if (!box) return;
    box.scrollLeft = Math.max(0, (box.scrollWidth - box.clientWidth) / 2);
  }, [nodes.length, zoom]);

  const open = nodes.find((n) => n.id === openId) ?? nodes[0];
  const openMembers = (open?.memberIds ?? []).map((id) => byId.get(id)).filter(Boolean) as StructurePerson[];
  const head = open?.headId ? byId.get(open.headId) : undefined;
  // В панели показываем и вложенные подразделения: руководителя отдела
  // интересует весь его блок, а не только те, кто числится прямо в нём.
  const subordinates = (open?.totalIds ?? [])
    .filter((id) => id !== open?.headId)
    .map((id) => byId.get(id))
    .filter(Boolean) as StructurePerson[];

  const visible = query
    ? subordinates.filter((p) =>
        `${p.name} ${p.title}`.toLowerCase().includes(query.toLowerCase()),
      )
    : subordinates;

  /** «Найти меня» — подсветить своё подразделение и прокрутить к нему. */
  const findMe = () => {
    const me = byId.get(currentUserId);
    if (!me?.departmentId) return;
    setOpenId(me.departmentId);
    canvas.current?.querySelector(`[data-dep="${me.departmentId}"]`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
  };

  const drop = (departmentId: string) => {
    const userId = dragging;
    setDragging(null);
    setOver(null);
    if (!userId || !canEdit) return;
    const data = new FormData();
    data.set("userId", userId);
    data.set("departmentId", departmentId);
    void moveEmployeeAction(data);
  };

  const branch = (node: StructureNode, depth: number): React.ReactNode => {
    const children = nodes.filter((n) => n.parentId === node.id);
    const isOpen = !collapsed[node.id];
    const nodeHead = node.headId ? byId.get(node.headId) : undefined;
    const active = node.id === openId;

    return (
      <div key={node.id} className="tree-node">
        <button
          type="button"
          data-dep={node.id}
          onClick={() => setOpenId(node.id)}
          onDragOver={(e) => {
            if (!canEdit || !dragging) return;
            e.preventDefault();
            setOver(node.id);
          }}
          onDragLeave={() => setOver((v) => (v === node.id ? null : v))}
          onDrop={(e) => {
            e.preventDefault();
            drop(node.id);
          }}
          className="card card-hover w-[236px] overflow-hidden p-0 text-left"
          style={{
            borderColor:
              over === node.id
                ? "var(--color-accent)"
                : active
                  ? "color-mix(in srgb, var(--color-accent) 55%, transparent)"
                  : undefined,
            boxShadow: active ? "0 0 0 3px color-mix(in srgb, var(--color-accent) 16%, transparent)" : undefined,
          }}
        >
          <span className="block px-3.5 pb-3 pt-3">
            <span className="flex items-center gap-2">
              {depth === 0 ? (
                <span
                  className="flex h-5 w-5 flex-none items-center justify-center rounded-[5px] text-[10px] font-bold text-white"
                  style={{ background: "var(--color-accent)" }}
                >
                  {companyMark}
                </span>
              ) : null}
              <span className="t-caption min-w-0 flex-1 truncate font-semibold">{node.name}</span>
            </span>

            {nodeHead ? (
              <span className="mt-2.5 flex items-center gap-2">
                <Avatar name={nodeHead.name} size={22} />
                <span className="min-w-0">
                  <span className="t-micro block truncate">{nodeHead.name}</span>
                  <span className="t-micro block truncate text-ink-faint">{nodeHead.title}</span>
                </span>
              </span>
            ) : (
              <span className="t-micro mt-2.5 block text-ink-faint">{t(S.structure.noHead)}</span>
            )}

            <span className="t-micro mt-2.5 flex items-center gap-1 text-ink-faint">
              {t(S.structure.subordinates)}
              <span className="t-num text-ink-muted">{node.totalIds.length}</span>

              {/* Действия живут на самом узле: отдел создаётся внутри того,
                  на который смотришь, а не «где-то в шапке страницы». */}
              {canEdit ? (
                <span className="ml-auto flex items-center gap-0.5">
                  <NodeAction label={t(S.structure.addSub)} onClick={() => setAdding(node.id)}>
                    <IconPlus size={12} />
                  </NodeAction>
                  <NodeAction label={t(S.structure.renameDepartment)} onClick={() => setRenaming(node)}>
                    <IconPencil size={12} />
                  </NodeAction>
                  {node.parentId ? (
                    <NodeAction label={t(S.structure.removeDepartment)} onClick={() => setRemoving(node)}>
                      <IconTrash size={12} />
                    </NodeAction>
                  ) : null}
                </span>
              ) : null}
            </span>
          </span>

          {children.length ? (
            <span
              onClick={(e) => {
                e.stopPropagation();
                setCollapsed((prev) => ({ ...prev, [node.id]: !prev[node.id] }));
              }}
              className="t-micro flex items-center justify-center gap-1 border-t border-hairline-soft py-1.5"
              style={{ background: "var(--color-surface-2)", color: "var(--color-accent)" }}
            >
              {f.plural(children.length, P.departments)}
              <span style={{ display: "inline-flex", transform: `rotate(${isOpen ? 180 : 0}deg)` }}>
                <IconChevron size={11} />
              </span>
            </span>
          ) : (
            <span className="t-micro block border-t border-hairline-soft py-1.5 text-center text-ink-faint">
              {t(S.structure.noChildren)}
            </span>
          )}
        </button>

        {children.length && isOpen ? (
          <>
            <span className="tree-stem" />
            <div className="tree-children">
              {children.map((child) => (
                <div key={child.id} className="tree-child">
                  {branch(child, depth + 1)}
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    );
  };

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
      <div className="card relative min-w-0 overflow-hidden">
        <div className="card-head flex-wrap">
          <div className="t-headline truncate">{companyName}</div>
          {canEdit ? (
            <button className="btn btn-primary btn-sm" onClick={() => setAdding(openId || null)}>
              <IconPlus size={14} /> {t(S.structure.addDepartment)}
            </button>
          ) : null}
        </div>

        <div ref={canvas} className="overflow-auto p-6" style={{ maxHeight: "64vh" }}>
          <div
            className="flex min-w-max justify-center gap-10"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center", width: "max-content", margin: "0 auto" }}
          >
            {roots.map((root) => branch(root, 0))}
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-hairline-soft px-4 py-2.5">
          <button className="btn btn-secondary btn-sm" onClick={findMe}>
            {t(S.structure.findMe)}
          </button>
          <span className="ml-auto flex items-center gap-1.5">
            <button className="btn-icon h-7 w-7" onClick={() => setZoom((z) => Math.max(50, z - 10))} aria-label="−">
              −
            </button>
            <span className="t-micro t-num w-12 text-center text-ink-muted">{zoom} %</span>
            <button className="btn-icon h-7 w-7" onClick={() => setZoom((z) => Math.min(140, z + 10))} aria-label="+">
              +
            </button>
          </span>
        </div>
      </div>

      <aside className="card min-w-0 self-start">
        <div className="card-head">
          <div className="t-headline min-w-0 truncate">{open?.name ?? "—"}</div>
        </div>

        <div className="p-4">
          <div className="mb-3 flex flex-wrap gap-1.5">
            <span className="chip chip-active">
              {t(S.structure.totalEmployees)}
              <span className="t-num">{open?.totalIds.length ?? 0}</span>
            </span>
            <span className="chip">
              {t(S.structure.inDepartment)}
              <span className="t-num">{openMembers.length}</span>
            </span>
          </div>

          <label className="relative mb-4 flex items-center">
            <span className="pointer-events-none absolute left-3 text-ink-faint">
              <IconSearch size={14} />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t(S.structure.searchPerson)}
              className="field pl-9 text-[13px]"
            />
          </label>

          <div className="t-micro mb-2 uppercase tracking-[0.07em] text-ink-faint">
            {t(S.structure.head)} <span className="t-num">{head ? 1 : 0}</span>
          </div>
          {head ? (
            <Person person={head} lead canEdit={canEdit} onDragStart={setDragging} onDragEnd={() => setDragging(null)} />
          ) : (
            <div className="t-caption mb-3 text-ink-faint">{t(S.structure.noHead)}</div>
          )}

          {canEdit && open ? (
            <form action={setDepartmentHeadAction} className="mb-4 mt-2">
              <input type="hidden" name="departmentId" value={open.id} />
              <HeadPicker
                locale={locale}
                current={open.headId ?? ""}
                people={openMembers.length ? openMembers : people}
              />
            </form>
          ) : null}

          <div className="mb-2 mt-4 flex items-center gap-2">
            <span className="t-micro uppercase tracking-[0.07em] text-ink-faint">
              {t(S.structure.subordinates)} <span className="t-num">{subordinates.length}</span>
            </span>
            {canEdit && open ? (
              <button
                type="button"
                onClick={() => setAddingPerson(open)}
                className="t-micro ml-auto flex items-center gap-1 text-ink-faint transition-colors hover:text-accent"
              >
                <IconPlus size={12} /> {t(S.structure.addPerson)}
              </button>
            ) : null}
          </div>
          <div className="max-h-[38vh] space-y-1 overflow-y-auto pr-1">
            {visible.map((person) => (
              <Person
                key={person.id}
                person={person}
                canEdit={canEdit}
                onDragStart={setDragging}
                onDragEnd={() => setDragging(null)}
                removeLabel={t(S.structure.removePerson)}
              />
            ))}
            {!visible.length ? (
              <div className="t-caption text-ink-faint">{t(S.structure.noPeople)}</div>
            ) : null}
          </div>

          {canEdit ? (
            <p className="t-micro mt-3 leading-relaxed text-ink-faint">{t(S.structure.dragHint)}</p>
          ) : null}
        </div>
      </aside>

      <Modal
        open={adding !== null}
        onClose={() => setAdding(null)}
        title={t(S.structure.addDepartment)}
        width={440}
      >
        <form
          action={(data) => {
            setAdding(null);
            return addDepartmentAction(data);
          }}
          className="space-y-3"
        >
          <input type="hidden" name="parentId" value={adding ?? ""} />
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="t-micro mb-1 block text-ink-faint">{t(S.structure.name)} · RU</span>
              <input name="nameRu" required autoFocus className="field text-[13px]" />
            </label>
            <label className="block">
              <span className="t-micro mb-1 block text-ink-faint">{t(S.structure.name)} · UZ</span>
              <input name="nameUz" className="field text-[13px]" />
            </label>
          </div>
          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.structure.parent)}</span>
            <span className="t-caption block text-ink-muted">
              {nodes.find((n) => n.id === adding)?.name ?? t(S.structure.root)}
            </span>
          </label>
          <label className="block">
            <span className="t-micro mb-1 block text-ink-faint">{t(S.structure.head)}</span>
            <NewHeadPicker locale={locale} people={people} />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAdding(null)}>
              {t(S.common.cancel)}
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              {t(S.common.save)}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={renaming !== null}
        onClose={() => setRenaming(null)}
        title={t(S.structure.renameDepartment)}
        width={440}
      >
        <form
          action={(data) => {
            setRenaming(null);
            return renameDepartmentAction(data);
          }}
          className="space-y-3"
        >
          <input type="hidden" name="departmentId" value={renaming?.id ?? ""} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="t-micro mb-1 block text-ink-faint">{t(S.structure.name)} · RU</span>
              <input name="nameRu" required autoFocus defaultValue={renaming?.name ?? ""} className="field text-[13px]" />
            </label>
            <label className="block">
              <span className="t-micro mb-1 block text-ink-faint">{t(S.structure.name)} · UZ</span>
              <input name="nameUz" defaultValue={renaming?.name ?? ""} className="field text-[13px]" />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRenaming(null)}>
              {t(S.common.cancel)}
            </button>
            <button type="submit" className="btn btn-primary btn-sm">{t(S.common.save)}</button>
          </div>
        </form>
      </Modal>

      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={t(S.structure.removeDepartment)}
        width={440}
      >
        <form
          action={(data) => {
            setRemoving(null);
            return removeDepartmentAction(data);
          }}
        >
          <input type="hidden" name="departmentId" value={removing?.id ?? ""} />
          <p className="t-body-sm mb-2">{removing?.name}</p>
          <p className="t-caption leading-relaxed text-ink-muted">{t(S.structure.removeHint)}</p>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRemoving(null)}>
              {t(S.common.cancel)}
            </button>
            <button type="submit" className="btn btn-primary btn-sm">{t(S.common.delete)}</button>
          </div>
        </form>
      </Modal>

      <Modal
        open={addingPerson !== null}
        onClose={() => setAddingPerson(null)}
        title={t(S.structure.addPerson)}
        width={460}
      >
        <p className="t-caption mb-4 leading-relaxed text-ink-muted">{t(S.structure.addPersonHint)}</p>
        <div className="max-h-[52vh] space-y-1 overflow-y-auto pr-1">
          {people
            .filter((person) => person.departmentId !== addingPerson?.id)
            .map((person) => (
              <form key={person.id} action={moveEmployeeAction}>
                <input type="hidden" name="userId" value={person.id} />
                <input type="hidden" name="departmentId" value={addingPerson?.id ?? ""} />
                <button
                  type="submit"
                  onClick={() => setAddingPerson(null)}
                  className="flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left transition-colors hover:bg-surface-2"
                >
                  <Avatar name={person.name} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="t-caption block truncate">{person.name}</span>
                    <span className="t-micro block truncate text-ink-faint">
                      {person.departmentId
                        ? (nodes.find((n) => n.id === person.departmentId)?.name ?? person.title)
                        : t(S.structure.unassigned)}
                    </span>
                  </span>
                  <IconPlus size={14} className="flex-none text-ink-faint" />
                </button>
              </form>
            ))}
        </div>
      </Modal>
    </div>
  );
}

function Person({
  person,
  lead,
  canEdit,
  onDragStart,
  onDragEnd,
  removeLabel,
}: {
  person: StructurePerson;
  lead?: boolean;
  canEdit: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  /** крестик «вывести из подразделения»; у руководителя его нет */
  removeLabel?: string;
}) {
  return (
    <div className="group flex items-center gap-1">
      <Link
        href={`/team/${person.id}`}
        draggable={canEdit}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", person.id);
          onDragStart(person.id);
        }}
        onDragEnd={onDragEnd}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[9px] px-2 py-1.5 transition-colors hover:bg-surface-2"
        style={{ cursor: canEdit ? "grab" : "pointer" }}
      >
        <Avatar name={person.name} size={30} />
        <span className="min-w-0 flex-1">
          <span className="t-caption block truncate">{person.name}</span>
          <span className="t-micro block truncate text-ink-faint">{person.title}</span>
        </span>
        {lead ? <span className="chip chip-active">★</span> : null}
      </Link>

      {canEdit && removeLabel ? (
        <form action={unassignEmployeeAction} className="flex-none">
          <input type="hidden" name="userId" value={person.id} />
          <button
            className="btn-icon h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
            aria-label={removeLabel}
            title={removeLabel}
          >
            <IconClose size={12} />
          </button>
        </form>
      ) : null}
    </div>
  );
}

/** Мелкая кнопка-действие на карточке подразделения. */
function NodeAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip text={label}>
      <span
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }}
        className="flex h-6 w-6 items-center justify-center rounded-[7px] text-ink-faint transition-colors hover:bg-surface-3 hover:text-ink"
      >
        {children}
      </span>
    </Tooltip>
  );
}

/** Назначение руководителя подразделения: список сразу отправляет форму. */
function HeadPicker({
  locale,
  current,
  people,
}: {
  locale: Locale;
  current: string;
  people: StructurePerson[];
}) {
  const t = translator(locale);
  const field = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={field} type="hidden" name="headId" defaultValue={current} />
      <Tooltip text={t(S.structure.setHead)}>
        <Select
          locale={locale}
          width="100%"
          value={current}
          options={[
            { value: "", label: t(S.structure.noHead) },
            ...people.map((p) => ({ value: p.id, label: p.name, hint: p.title })),
          ]}
          onChange={(next) => {
            if (field.current) field.current.value = next;
            field.current?.form?.requestSubmit();
          }}
        />
      </Tooltip>
    </>
  );
}

function NewHeadPicker({ locale, people }: { locale: Locale; people: StructurePerson[] }) {
  const t = translator(locale);
  const [value, setValue] = useState("");
  return (
    <>
      <input type="hidden" name="headId" value={value} />
      <Select
        locale={locale}
        width="100%"
        value={value}
        options={[
          { value: "", label: t(S.structure.noHead) },
          ...people.map((p) => ({ value: p.id, label: p.name, hint: p.title })),
        ]}
        onChange={setValue}
      />
    </>
  );
}
