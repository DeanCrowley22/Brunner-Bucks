"use client";
import { useState } from "react";
import { AvatarCharacter, AvatarDesign } from "./pupil-avatar";
import { Dices, RotateCcw, Save, Sparkles, ShoppingBag } from "lucide-react";
type Item = {
  id: string;
  name: string;
  type: string;
  assetKey: string;
  rarity: string;
  description: string;
};
const choices = {
  skin: ["pale", "light", "warm", "olive", "tan", "deep"],
  hair: ["short", "long", "bob", "curly", "afro", "buns", "spiky", "mohawk"],
  hairColor: [
    "black",
    "brown",
    "blonde",
    "auburn",
    "silver",
    "blue",
    "pink",
    "purple",
  ],
  eyes: ["brown", "hazel", "blue", "green", "grey", "violet"],
};
const labels: Record<string, string> = {
  skin: "Skin tone",
  hair: "Hair style",
  hairColor: "Hair colour",
  eyes: "Eye colour",
};
export function AvatarStudio({
  name,
  initial,
  owned,
  action,
}: {
  name: string;
  initial: AvatarDesign;
  owned: Item[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const normalized = {
      skin: initial.skin || "warm",
      hair: initial.hair || "short",
      hairColor: initial.hairColor || "brown",
      eyes: initial.eyes || "brown",
      outfit: initial.outfit || "default",
      accessory: initial.accessory || null,
    },
    [design, setDesign] = useState<AvatarDesign>(normalized),
    [section, setSection] = useState("appearance"),
    set = (key: keyof AvatarDesign, value: string | null) =>
      setDesign((d) => ({ ...d, [key]: value }));
  const randomize = () =>
    setDesign((d) => ({
      ...d,
      skin: pick(choices.skin),
      hair: pick(choices.hair),
      hairColor: pick(choices.hairColor),
      eyes: pick(choices.eyes),
    }));
  return (
    <div className="studio-shell">
      <aside className="avatar-preview card">
        <span className="studio-badge">
          <Sparkles /> Live preview
        </span>
        <div className="avatar-stage">
          <AvatarCharacter name={name} design={design} size={250} />
        </div>
        <h2>{name}</h2>
        <p>Your one-of-a-kind Brunner Bucks character.</p>
        <div className="preview-actions">
          <button type="button" onClick={randomize}>
            <Dices /> Surprise me
          </button>
          <button type="button" onClick={() => setDesign(normalized)}>
            <RotateCcw /> Reset
          </button>
        </div>
        <div className="collection-count">
          <b>{owned.length}</b>
          <span>collectibles unlocked</span>
        </div>
      </aside>
      <section className="studio-workspace">
        <div className="studio-heading">
          <div>
            <span className="eyebrow">Character creator</span>
            <h2>Build your look</h2>
            <p>
              All appearance choices are free. Special clothes and accessories
              are collected through rewards.
            </p>
          </div>
        </div>
        <div className="studio-tabs">
          <button
            type="button"
            className={section === "appearance" ? "active" : ""}
            onClick={() => setSection("appearance")}
          >
            <Sparkles /> Appearance
          </button>
          <button
            type="button"
            className={section === "wardrobe" ? "active" : ""}
            onClick={() => setSection("wardrobe")}
          >
            <ShoppingBag /> My wardrobe <small>{owned.length}</small>
          </button>
        </div>
        <form action={action} className="card avatar-controls">
          {section === "appearance" && (
            <div className="appearance-panels">
              {Object.entries(choices).map(([key, values]) => (
                <fieldset key={key}>
                  <legend>{labels[key]}</legend>
                  <p>
                    Choose the {labels[key].toLowerCase()} that feels most like
                    you.
                  </p>
                  <div className="choice-row">
                    {values.map((value) => (
                      <label
                        title={value}
                        className={
                          design[key as keyof AvatarDesign] === value
                            ? "selected"
                            : ""
                        }
                        key={value}
                      >
                        <input
                          type="radio"
                          name={key}
                          value={value}
                          checked={design[key as keyof AvatarDesign] === value}
                          onChange={() => set(key as keyof AvatarDesign, value)}
                        />
                        <span className={`choice-swatch ${key}-${value}`} />
                        <b>{value}</b>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          )}
          {section !== "appearance" && (
            <div className="wardrobe-panels">
              <fieldset>
                <legend>Outfits</legend>
                <p>Equip one of the clothes you have collected.</p>
                <div className="inventory-grid">
                  <ItemChoice
                    label="Everyday top"
                    assetKey="default"
                    selected={!design.outfit || design.outfit === "default"}
                    type="outfit"
                    onSelect={() => set("outfit", "default")}
                  />
                  {owned
                    .filter((x) => x.type === "OUTFIT")
                    .map((item) => (
                      <ItemChoice
                        key={item.id}
                        label={item.name}
                        assetKey={item.assetKey}
                        rarity={item.rarity}
                        selected={design.outfit === item.assetKey}
                        type="outfit"
                        onSelect={() => set("outfit", item.assetKey)}
                      />
                    ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Accessories</legend>
                <p>Add one special finishing touch.</p>
                <div className="inventory-grid">
                  <ItemChoice
                    label="No accessory"
                    assetKey="none"
                    selected={!design.accessory}
                    type="accessory"
                    onSelect={() => set("accessory", null)}
                  />
                  {owned
                    .filter((x) => x.type === "ACCESSORY")
                    .map((item) => (
                      <ItemChoice
                        key={item.id}
                        label={item.name}
                        assetKey={item.assetKey}
                        rarity={item.rarity}
                        selected={design.accessory === item.assetKey}
                        type="accessory"
                        onSelect={() => set("accessory", item.assetKey)}
                      />
                    ))}
                </div>
              </fieldset>
            </div>
          )}
          <input type="hidden" name="skin" value={design.skin} />
          <input type="hidden" name="hair" value={design.hair} />
          <input type="hidden" name="hairColor" value={design.hairColor} />
          <input type="hidden" name="eyes" value={design.eyes} />
          <input
            type="hidden"
            name="outfit"
            value={design.outfit || "default"}
          />
          <input
            type="hidden"
            name="accessory"
            value={design.accessory || ""}
          />
          <div className="studio-save-bar">
            <span>Happy with your character?</span>
            <button className="btn gold avatar-save">
              <Save /> Save my character
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
function ItemChoice({
  label,
  assetKey,
  rarity,
  selected,
  type,
  onSelect,
}: {
  label: string;
  assetKey: string;
  rarity?: string;
  selected: boolean;
  type: string;
  onSelect: () => void;
}) {
  return (
    <label className={selected ? "selected" : ""}>
      <input type="radio" checked={selected} onChange={onSelect} />
      <span className={`item-preview ${type}-${assetKey}`}>
        {type === "accessory" && assetKey !== "none" ? "★" : ""}
      </span>
      <b>{label}</b>
      {rarity && (
        <small className={`rarity ${rarity.toLowerCase()}`}>{rarity}</small>
      )}
    </label>
  );
}
function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}
