'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { authFetch } from '@/lib/auth-fetch';
import { MoreHorizontal, Plus, Save, Trash2, X } from 'lucide-react';

type Category = {
  id: string;
  name: string;
  icon?: string | null;
  parentId?: string | null;
  isArchived: boolean;
  isSystem?: boolean;
  sortOrder?: number;
};
const defaults = [
  'Zakupy',
  'Edukacja',
  'Mieszkanie/Dom',
  'Osobiste',
  'Podatki',
  'Przychód',
  'Rachunki/Media',
  'Rozrywka',
  'Zdrowie',
];
const icons = [
  '🛍️',
  '🏠',
  '👤',
  '🏛️',
  '💰',
  '🧾',
  '🎵',
  '❤',
  '🏷️',
  '✉️',
  '🗃️',
  '📷',
  '🏪',
  '🛒',
  '✈️',
  '⚓',
  '⚑',
  '🧩',
  '🎨',
  '🎮',
  '⭐',
  '✚',
  '♡',
  '🙂',
  '🔑',
  '☀️',
  '🏔️',
  '👜',
  '🏡',
  '🚗',
  '🤝',
  '💔',
  '📄',
  '🚲',
  '💼',
  '🏥',
  '💊',
  '🩺',
  '⚽',
  '🎬',
  '📚',
  '🍽️',
  '☕',
  '🍎',
  '🐾',
  '🔧',
  '🔒',
  '📱',
  '💻',
  '💳',
  '🏦',
  '📈',
  '📉',
  '🪙',
  '💵',
  '💶',
  '🚆',
  '⛽',
  '🚕',
  '🚌',
  '🚇',
  '🚄',
  '🛵',
  '🅿️',
  '⚡',
  '🔌',
  '💡',
  '🌐',
  '📺',
  '🎁',
  '🍕',
  '🍺',
  '🍷',
  '🥗',
  '👶',
  '🐶',
  '🐱',
  '🌳',
  '🎓',
  '🧸',
  '🛋️',
  '🛠️',
  '🧹',
  '🏃',
  '🏆',
  '📻',
  '☎️',
  '🎭',
  '🥖',
  '🦷',
  '💆',
  '🤲',
  '⏰',
  '📽️',
  '🎞️',
  '🎰',
  '📰',
  '🛟',
  '📦',
  '🖍️',
  '🎉',
  '🏬',
  '🤑',
  '🎂',
];
const childDefaults: Record<string, string[]> = {
  Zakupy: [
    'Spożywcze',
    'Papierosy',
    'Gadżety i czasopisma',
    'Chemia',
    'Hobby',
    'Odzież i obuwie',
    'Elektronika i oprogramowanie',
    'Alkohol',
    'Inne zakupy',
  ],
  Edukacja: [
    'Edukacja i rozwój osobisty',
    'Przedszkole i opiekunka',
    'Zabawki',
    'Inne (dzieci i edukacja)',
  ],
  'Mieszkanie/Dom': [
    'Kredyt hipoteczny',
    'Meble, sprzęt, wyposażenie',
    'Ogród',
    'Remont i rozbudowa',
    'Usługi dla mieszkania, domu',
    'Inne (mieszkanie, dom)',
  ],
  Osobiste: [
    'Kosmetyki i higiena osobista',
    'Bilety i taksówki',
    'Sport',
    'Włosy',
    'Masaż, solarium, spa',
    'Zwierzęta',
    'Spłata pożyczki',
    'Udzielenie pożyczki',
    'Ubezpieczenie na życie',
    'Inne osobiste',
  ],
  Podatki: ['Podatek dochodowy', 'VAT', 'ZUS', 'Podatek Belki', 'Inne podatki i opłaty'],
  Przychód: [
    'Nadgodziny',
    'Pożyczka, kredyt',
    'Pensja',
    'Zapłata za usługę',
    'Sprzedaż towarów',
    'Premia, nagroda',
    'Otrzymany prezent',
    'Inwestycje finansowe',
    'Zwrot',
    'Odsetki bankowe',
    'Inne przychody',
  ],
  'Rachunki/Media': [
    'Prąd',
    'Gaz',
    'Internet',
    'Komórka',
    'Telefon stacjonarny',
    'Kablowka i satelita',
    'Czynsz i wynajem',
    'Woda',
    'Kanalizacja',
    'Ubezpieczenie mieszkania, domu',
    'Opłaty i prowizje bankowe',
    'Inne rachunki',
  ],
  Rozrywka: [
    'Restauracje, puby, kluby',
    'Filmy, gry, płyty',
    'Książki, kino, teatr',
    'Wyjazdy, podróże, wakacje',
    'Loterie, kasyna, hazard',
    'Inne formy rozrywki',
  ],
  Zdrowie: [
    'Lekarstwa',
    'Dentysta',
    'Okulista',
    'Lekarz (inny)',
    'Ubezpieczenie zdrowotne',
    'Inne (zdrowie)',
  ],
  Samochód: ['Paliwo', 'Parkowanie', 'Serwis i części', 'Opłaty', 'OC / AC', 'Inne (samochód)'],
};

function defaultChildIcon(name: string) {
  const value = name.toLocaleLowerCase('pl-PL');
  const rules: Array<[string[], string]> = [
    [['spożywcze', 'spoĹĽywcze'], '🥖'],
    [['alkohol'], '🍷'],
    [['chemia'], '🧼'],
    [['elektronika'], '💻'],
    [['odzież', 'obuwie'], '👕'],
    [['papierosy'], '🚬'],
    [['edukacja', 'rozwój'], '📚'],
    [['przedszkole', 'opiekunka'], '🧸'],
    [['zabawki'], '🧩'],
    [['dzieci'], '👶'],
    [['kredyt'], '🏦'],
    [['meble', 'wyposażenie'], '🛋️'],
    [['ogród'], '🌳'],
    [['remont'], '🛠️'],
    [['bilety', 'taksówki'], '🎫'],
    [['kosmetyki'], '🧴'],
    [['sport'], '🏃'],
    [['włosy'], '💇'],
    [['zwierzęta'], '🐾'],
    [['podatek'], '💰'],
    [['zus'], '👨‍💼'],
    [['vat'], '🏛️'],
    [['pensja'], '💼'],
    [['premia'], '🏆'],
    [['prezent'], '🎁'],
    [['odsetki'], '🏦'],
    [['zwrot'], '↩️'],
    [['czynsz', 'wynajem'], '🏢'],
    [['gaz'], '🔥'],
    [['internet'], '🌐'],
    [['telewiz', 'satelita'], '📺'],
    [['kanalizacja', 'woda'], '🚰'],
    [['komórka'], '📱'],
    [['prąd'], '⚡'],
    [['telefon'], '☎️'],
    [['restauracje', 'puby'], '🍻'],
    [['podróże', 'wyjazdy'], '✈️'],
    [['dentysta'], '🦷'],
    [['lekarstwa'], '💊'],
    [['okulista'], '👓'],
    [['lekarz'], '👨‍⚕️'],
  ];
  return rules.find(([words]) => words.some((word) => value.includes(word)))?.[1] ?? '•';
}

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [groupName, setGroupName] = useState('');
  const [childName, setChildName] = useState('');
  const [childIcon, setChildIcon] = useState('â€˘');
  const [childParent, setChildParent] = useState<string | null>(null);
  const [showGroup, setShowGroup] = useState(false);
  const [groupIcon, setGroupIcon] = useState('🗂️');
  const [editingGroup, setEditingGroup] = useState<Category | null>(null);

  async function load() {
    const response = await authFetch('/api/v1/categories');
    if (response.ok) {
      let loaded = (await response.json()) as Category[];
      if (loaded.length === 0) {
        for (const name of defaults)
          await authFetch('/api/v1/categories', {
            method: 'POST',
            body: JSON.stringify({
              name,
              parentId: null,
              sortOrder: defaults.indexOf(name),
              isSystem: true,
            }),
          });
        const seeded = await authFetch('/api/v1/categories');
        loaded = seeded.ok ? await seeded.json() : [];
      }
      for (const group of loaded.filter((x) => !x.parentId)) {
        const existingChildren = new Set(
          loaded.filter((x) => x.parentId === group.id).map((x) => x.name),
        );
        for (const name of (childDefaults[group.name] ?? []).filter(
          (x) => !existingChildren.has(x),
        )) {
          await authFetch('/api/v1/categories', {
            method: 'POST',
            body: JSON.stringify({
              name,
              parentId: group.id,
              sortOrder: existingChildren.size,
              isSystem: true,
            }),
          });
        }
      }
      if (loaded.some((x) => (childDefaults[x.name] ?? []).length > 0)) {
        const refreshed = await authFetch('/api/v1/categories');
        loaded = refreshed.ok ? await refreshed.json() : loaded;
      }
      for (const child of loaded.filter(
        (item) => item.parentId && !item.icon && !item.isArchived,
      )) {
        const icon = defaultChildIcon(child.name);
        await authFetch(`/api/v1/categories/${child.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: child.name,
            parentId: child.parentId,
            icon,
            sortOrder: child.sortOrder ?? 0,
            isSystem: child.isSystem ?? true,
          }),
        });
        child.icon = icon;
      }
      setItems(loaded);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function create(name: string, parentId: string | null = null, icon: string | null = null) {
    if (!name.trim()) return;
    await authFetch('/api/v1/categories', {
      method: 'POST',
      body: JSON.stringify({
        name: name.trim(),
        parentId,
        icon,
        sortOrder: items.length,
        isSystem: false,
      }),
    });
    await load();
  }
  async function removeChild(id: string) {
    await authFetch(`/api/v1/categories/${id}/archive`, { method: 'POST' });
    await load();
  }
  async function removeGroup(id: string) {
    for (const child of children(id))
      await authFetch(`/api/v1/categories/${child.id}/archive`, {
        method: 'POST',
      });
    await authFetch(`/api/v1/categories/${id}/archive`, { method: 'POST' });
    await load();
  }
  async function saveGroup() {
    if (!editingGroup?.name.trim()) return;
    await authFetch(`/api/v1/categories/${editingGroup.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: editingGroup.name,
        parentId: null,
        icon: editingGroup.icon,
        sortOrder: editingGroup.sortOrder ?? 0,
        isSystem: editingGroup.isSystem ?? false,
      }),
    });
    setEditingGroup(null);
    await load();
  }
  const groups = items
    .filter((x) => !x.parentId && !x.isArchived)
    .sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  const children = (parentId: string) =>
    items
      .filter((x) => x.parentId === parentId && !x.isArchived)
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'));

  return (
    <AppShell>
      <section className="space-y-6 rounded-3xl border border-line bg-panel/80 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Kategorie</h1>
            <p className="mt-1 text-sm text-muted">
              Organizuj wydatki i przychody według grup oraz podkategorii.
            </p>
          </div>
          <button
            onClick={() => setShowGroup(true)}
            className="rounded-xl bg-accent px-4 py-2 text-black"
          >
            {' '}
            + Dodaj grupę kategorii
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <article key={group.id} className="rounded-2xl border border-line bg-white/[0.03] p-4">
              <div className="flex items-center justify-between rounded-xl border border-line bg-panel px-3 py-3">
                <span className="text-xl">{group.icon || '🗂️'}</span>
                <strong>{group.name}</strong>
                <button
                  title="Edytuj kategorię"
                  onClick={() => setEditingGroup({ ...group })}
                  className="text-lg text-muted hover:text-white"
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>
              <button
                onClick={() => {
                  setChildParent(group.id);
                  setChildName('');
                  setChildIcon('â€˘');
                }}
                className="mt-4 text-sm text-accent"
              >
                + Dodaj kategorię
              </button>
              <div className="mt-3 space-y-2">
                {children(group.id).map((child) => (
                  <div
                    key={child.id}
                    className="flex items-center justify-between border-l-2 border-accent/40 pl-3 text-sm text-muted"
                  >
                    <span>
                      {child.icon || '•'} {child.name}
                    </span>
                    <button
                      title="Usuń podkategorię"
                      aria-label="Usuń podkategorię"
                      onClick={() => removeChild(child.id)}
                      className="text-base text-muted hover:text-rose-400"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
        {editingGroup && (
          <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-4">
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-line bg-panel p-6">
              <h2 className="text-xl font-semibold">Edytuj grupę kategorii</h2>
              <input
                value={editingGroup.name}
                onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                className="mt-5 w-full rounded-xl border border-line bg-panel px-3 py-2"
              />
              <div className="mt-5 grid max-h-[55vh] grid-cols-6 gap-2 overflow-y-auto pr-2 sm:grid-cols-8">
                {icons.map((icon) => (
                  <button
                    type="button"
                    key={icon}
                    onClick={() => setEditingGroup({ ...editingGroup, icon })}
                    className={`rounded-xl p-3 text-xl ${editingGroup.icon === icon ? 'border-2 border-accent bg-white/10' : 'border border-line'}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <div className="mt-6 flex justify-between">
                <button
                  onClick={async () => {
                    await removeGroup(editingGroup.id);
                    setEditingGroup(null);
                  }}
                  className="rounded-xl border border-rose-400/50 px-4 py-2 text-rose-400"
                >
                  Usuń grupę
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingGroup(null)}
                    className="rounded-xl border border-line px-4 py-2"
                  >
                    Anuluj
                  </button>
                  <button onClick={saveGroup} className="rounded-xl bg-accent px-4 py-2 text-black">
                    <Save size={15} /> Zapisz
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {showGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-line bg-panel p-6">
              <h2 className="text-xl font-semibold">Dodaj grupę kategorii</h2>
              <input
                autoFocus
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Nazwa grupy"
                className="mt-5 w-full rounded-xl border border-line bg-panel px-3 py-2"
              />
              <div className="mt-5 grid max-h-[38vh] grid-cols-6 gap-2 overflow-y-auto pr-2 sm:grid-cols-8">
                {icons.map((icon) => (
                  <button
                    type="button"
                    key={icon}
                    onClick={() => setGroupIcon(icon)}
                    className={`rounded-xl p-3 text-xl ${groupIcon === icon ? 'border-2 border-accent bg-white/10' : 'border border-line'}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <div className="mt-5 flex shrink-0 justify-end gap-3 border-t border-line pt-4">
                <button
                  onClick={() => setShowGroup(false)}
                  className="rounded-xl border border-line px-4 py-2"
                >
                  Anuluj
                </button>
                <button
                  onClick={async () => {
                    await create(groupName, null, groupIcon);
                    setGroupName('');
                    setShowGroup(false);
                  }}
                  className="rounded-xl bg-accent px-4 py-2 text-black"
                >
                  Dodaj
                </button>
              </div>
            </div>
          </div>
        )}
        {childParent && (
          <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-4">
            <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-line bg-panel p-6">
              <h2 className="text-xl font-semibold">Dodaj podkategorię</h2>
              <p className="mt-1 text-sm text-muted">
                Grupa: {groups.find((x) => x.id === childParent)?.name}
              </p>
              <input
                autoFocus
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="Nazwa podkategorii"
                className="mt-5 w-full rounded-xl border border-line bg-panel px-3 py-2"
              />
              <p className="mt-5 text-sm text-muted">Wybierz ikonę podkategorii</p>
              <div className="mt-2 grid max-h-[32vh] grid-cols-6 gap-2 overflow-y-auto pr-2 sm:grid-cols-8">
                {icons.map((icon) => (
                  <button
                    type="button"
                    key={icon}
                    onClick={() => setChildIcon(icon)}
                    className={`rounded-xl p-3 text-xl ${childIcon === icon ? 'border-2 border-accent bg-white/10' : 'border border-line'}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <div className="mt-5 flex shrink-0 justify-end gap-3 border-t border-line pt-4">
                <button
                  onClick={() => setChildParent(null)}
                  className="rounded-xl border border-line px-4 py-2"
                >
                  Anuluj
                </button>
                <button
                  onClick={async () => {
                    await create(childName, childParent, childIcon);
                    setChildParent(null);
                  }}
                  className="rounded-xl bg-accent px-4 py-2 text-black"
                >
                  Dodaj
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
