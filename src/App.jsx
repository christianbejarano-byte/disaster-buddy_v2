import React, { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { translations, languages } from "./i18n.js";

const categoryMeta = {
  all: { emoji: "✨", color: "#111827" },
  libraries: { emoji: "📚", color: "#334155" },
  cooling: { emoji: "❄️", color: "#0284c7" },
  sandbags: { emoji: "🧱", color: "#dc2626" },
  parks: { emoji: "🌳", color: "#16a34a" },
  food: { emoji: "🥫", color: "#ca8a04" },
  medical: { emoji: "🏥", color: "#be123c" },
  shelter: { emoji: "🏠", color: "#7c3aed" }
};

const emptyPlan = {
  location: "",
  contacts: "",
  meeting: "",
  medical: "",
  transportation: "",
  hazards: "",
  household: ""
};

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

export default function App() {
  const [page, setPage] = useState("discover");
  const [lang, setLang] = useLocalStorage("db_lang", "en");
  const [resources, setResources] = useState([]);
  const [category, setCategory] = useState("all");
  const [county, setCounty] = useState("all");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useLocalStorage("db_saved_places", []);
  const [checked, setChecked] = useLocalStorage("db_checklist", {});
  const [plan, setPlan] = useLocalStorage("db_emergency_plan", emptyPlan);
  const t = translations[lang] || translations.en;
  const isRtl = lang === "ar" || lang === "fa";

  useEffect(() => {
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [isRtl, lang]);

  useEffect(() => {
    fetch("/data/resources.geojson")
      .then((res) => res.json())
      .then((geojson) => {
        const list = geojson.features.map((feature, index) => ({
          id: feature.properties.id || String(index + 1),
          name: feature.properties.name,
          address: feature.properties.address,
          category: feature.properties.category,
          county: feature.properties.county || "San Diego",
          description: feature.properties.description,
          coordinates: feature.geometry.coordinates
        }));
        setResources(list);
      })
      .catch(() => setResources([]));
  }, []);

  const filteredResources = useMemo(() => {
    return resources.filter((item) => {
      const categoryMatch = category === "all" || item.category === category;
      const countyMatch = county === "all" || item.county === county;
      const text = `${item.name} ${item.address} ${item.description} ${item.county}`.toLowerCase();
      const queryMatch = text.includes(query.toLowerCase());
      return categoryMatch && countyMatch && queryMatch;
    });
  }, [resources, category, county, query]);

  const savedItems = resources.filter((item) => saved.includes(item.id));
  const completedCount = Object.values(checked).filter(Boolean).length;
  const totalCount = t.checklistItems.length;
  const progress = Math.round((completedCount / totalCount) * 100);

  const toggleSave = (id) => {
    setSaved((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  return (
    <div className={`app-shell ${isRtl ? "rtl" : ""}`}>
      <header className="topbar">
        <div>
          <p className="eyebrow">Community readiness</p>
          <h1>{t.appName}</h1>
        </div>
        <select
          className="language-select"
          value={lang}
          onChange={(event) => setLang(event.target.value)}
          aria-label={t.language}
        >
          {languages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.label}
            </option>
          ))}
        </select>
      </header>

      <main className="main-content">
        {page === "discover" && (
          <Discover t={t} query={query} setQuery={setQuery} category={category} setCategory={setCategory} county={county} setCounty={setCounty} resources={filteredResources} saved={saved} toggleSave={toggleSave} setPage={setPage} />
        )}
        {page === "map" && (
          <MapPage t={t} resources={filteredResources} category={category} setCategory={setCategory} county={county} setCounty={setCounty} saved={saved} toggleSave={toggleSave} />
        )}
        {page === "plan" && (
          <Plan t={t} checked={checked} setChecked={setChecked} progress={progress} plan={plan} setPlan={setPlan} savedItems={savedItems} resources={filteredResources} setPage={setPage} />
        )}
        {page === "activate" && <ActivatePlan t={t} plan={plan} checked={checked} resources={savedItems.length ? savedItems : filteredResources.slice(0, 5)} setPage={setPage} />}
        {page === "assistant" && <Assistant t={t} lang={lang} plan={plan} checked={checked} resources={savedItems.length ? savedItems : filteredResources.slice(0, 5)} />}
        {page === "profile" && <Profile t={t} savedItems={savedItems} saved={saved} toggleSave={toggleSave} progress={progress} setPage={setPage} />}
        {page === "about" && <About t={t} />}
      </main>

      <nav className="bottom-nav">
        {[
          ["discover", "⌁", t.discover],
          ["map", "⌖", t.map],
          ["plan", "✓", t.plan],
          ["assistant", "◌", t.assistant],
          ["profile", "♡", t.profile]
        ].map(([key, icon, label]) => (
          <button key={key} className={page === key ? "active" : ""} onClick={() => setPage(key)}>
            <span>{icon}</span>{label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Discover({ t, query, setQuery, category, setCategory, county, setCounty, resources, saved, toggleSave, setPage }) {
  return (
    <section className="page">
      <div className="hero-card">
        <p className="eyebrow">Local guide</p>
        <h2>{t.tagline}</h2>
        <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.searchPlaceholder} />
        <button className="activate-button" onClick={() => setPage("activate")}>{t.activateEmergencyPlan}</button>
      </div>
      <Filters t={t} category={category} setCategory={setCategory} county={county} setCounty={setCounty} />
      <div className="section-heading"><h3>{t.nearbyResources}</h3><button className="text-button" onClick={() => setPage("map")}>{t.openMap}</button></div>
      <div className="card-grid">{resources.map((resource) => <ResourceCard key={resource.id} resource={resource} saved={saved.includes(resource.id)} toggleSave={toggleSave} t={t} />)}</div>
    </section>
  );
}

function Filters({ t, category, setCategory, county, setCounty }) {
  const categories = [["all", t.all], ["libraries", t.libraries], ["cooling", t.cooling], ["sandbags", t.sandbags], ["parks", t.parks], ["food", t.food], ["medical", t.medical], ["shelter", t.shelter]];
  return (
    <>
      <div className="chips" aria-label={t.categories}>{categories.map(([key, label]) => <button key={key} className={category === key ? "chip active" : "chip"} onClick={() => setCategory(key)}><span>{categoryMeta[key].emoji}</span>{label}</button>)}</div>
      <div className="filter-row"><label>{t.county}</label><select value={county} onChange={(event) => setCounty(event.target.value)}><option value="all">{t.allCounties}</option><option value="San Diego">{t.sanDiego}</option><option value="Imperial">{t.imperial}</option><option value="Los Angeles">{t.losAngeles}</option><option value="San Francisco">{t.sanFrancisco}</option><option value="Bay Area">{t.bayArea}</option></select></div>
    </>
  );
}

function ResourceCard({ resource, saved, toggleSave, t }) {
  return (
    <article className="resource-card">
      <div className="card-top"><div className="category-badge" style={{ background: categoryMeta[resource.category]?.color }}>{categoryMeta[resource.category]?.emoji}</div><button className={saved ? "heart saved" : "heart"} onClick={() => toggleSave(resource.id)}>{saved ? "♥" : "♡"}</button></div>
      <h3>{resource.name}</h3><p className="muted">{resource.address}</p><p className="county-pill">{resource.county}</p><p>{resource.description}</p><button className="small-button" onClick={() => toggleSave(resource.id)}>{saved ? t.saved : t.save}</button>
    </article>
  );
}

function MapPage({ t, resources, category, setCategory, county, setCounty, saved, toggleSave }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    mapRef.current = new mapboxgl.Map({ container: mapContainer.current, style: "mapbox://styles/mapbox/standard", center: [-117.1611, 32.7157], zoom: 7.25 });
    mapRef.current.addControl(new mapboxgl.NavigationControl(), "bottom-right");
  }, []);
  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach((marker) => marker.remove()); markersRef.current = [];
    const bounds = new mapboxgl.LngLatBounds();
    resources.forEach((resource) => {
      const el = document.createElement("button"); el.className = "map-marker"; el.style.background = categoryMeta[resource.category]?.color || "#111827"; el.innerText = categoryMeta[resource.category]?.emoji || "•"; el.setAttribute("aria-label", resource.name);
      const popupNode = document.createElement("div"); popupNode.className = "popup"; popupNode.innerHTML = `<strong>${resource.name}</strong><p>${resource.address}</p><p>${resource.county}</p><p>${resource.description}</p>`;
      const marker = new mapboxgl.Marker(el).setLngLat(resource.coordinates).setPopup(new mapboxgl.Popup({ offset: 20 }).setDOMContent(popupNode)).addTo(mapRef.current);
      bounds.extend(resource.coordinates);
      el.addEventListener("dblclick", () => toggleSave(resource.id)); markersRef.current.push(marker);
    });
    if (resources.length === 1) mapRef.current.flyTo({ center: resources[0].coordinates, zoom: 11 });
    if (resources.length > 1 && !bounds.isEmpty()) mapRef.current.fitBounds(bounds, { padding: 70, maxZoom: 10 });
  }, [resources, toggleSave]);
  return <section className="page map-page"><Filters t={t} category={category} setCategory={setCategory} county={county} setCounty={setCounty} /><div className="map-wrap" ref={mapContainer} /><p className="hint">Double-tap a marker to save it. Saved count: {saved.length}</p></section>;
}

function Plan({ t, checked, setChecked, progress, plan, setPlan, savedItems, resources, setPage }) {
  const update = (field, value) => setPlan((current) => ({ ...emptyPlan, ...current, [field]: value }));
  const fields = [["location", t.locationLabel], ["contacts", t.contactsLabel], ["meeting", t.meetingLabel], ["medical", t.medicalLabel], ["transportation", t.transportationLabel], ["hazards", t.hazardsLabel], ["household", t.householdLabel]];
  return (
    <section className="page">
      <div className="panel"><p className="eyebrow">{t.progress}</p><h2>{progress}%</h2><div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div><p className="muted">{t.checklistIntro}</p><button className="activate-button" onClick={() => setPage("activate")}>{t.activateEmergencyPlan}</button></div>
      <div className="panel"><p className="eyebrow">{t.emergencyPlan}</p><h2>{t.emergencyChecklist}</h2>{fields.map(([field, label]) => <label className="form-field" key={field}><span>{label}</span><textarea value={plan[field] || ""} onChange={(event) => update(field, event.target.value)} placeholder={field === "location" ? "Pacific Beach, San Diego County" : ""} /></label>)}<button className="small-button" onClick={() => setPage("activate")}>{t.savePlan}</button></div>
      <div className="checklist">{t.checklistItems.map((item, index) => <label key={item} className="check-item"><input type="checkbox" checked={Boolean(checked[index])} onChange={(event) => setChecked((current) => ({ ...current, [index]: event.target.checked }))} /><span>{item}</span></label>)}</div>
      <div className="section-heading"><h3>{t.recommendedResources}</h3><span className="count-pill">{savedItems.length || resources.length}</span></div>
    </section>
  );
}

function ActivatePlan({ t, plan, checked, resources, setPage }) {
  const activePlan = { ...emptyPlan, ...plan };
  const readyItems = t.checklistItems.filter((_, index) => checked[index]);
  const missingItems = t.checklistItems.filter((_, index) => !checked[index]);
  const steps = buildActivationSteps(activePlan, missingItems);
  return (
    <section className="page">
      <div className="hero-card emergency-hero"><p className="eyebrow">{t.activationIntro}</p><h2>{t.activateEmergencyPlan}</h2><button className="small-button" onClick={() => setPage("plan")}>{t.plan}</button></div>
      <div className="panel"><p className="eyebrow">{t.currentPlan}</p><PlanSummary t={t} plan={activePlan} /></div>
      <div className="panel"><p className="eyebrow">{t.activationSteps}</p>{steps.map((step, i) => <p key={i} className="activation-step"><strong>{i + 1}.</strong> {step}</p>)}</div>
      {readyItems.length > 0 && <div className="panel"><p className="eyebrow">Ready items</p>{readyItems.map((item) => <p key={item}>✓ {item}</p>)}</div>}
      <div className="section-heading"><h3>{t.recommendedResources}</h3><span className="count-pill">{resources.length}</span></div>
      <div className="card-grid">{resources.map((resource) => <ResourceCard key={resource.id} resource={resource} saved={true} toggleSave={() => {}} t={t} />)}</div>
    </section>
  );
}

function PlanSummary({ t, plan }) {
  const rows = [[t.locationLabel, plan.location], [t.contactsLabel, plan.contacts], [t.meetingLabel, plan.meeting], [t.medicalLabel, plan.medical], [t.transportationLabel, plan.transportation], [t.hazardsLabel, plan.hazards], [t.householdLabel, plan.household]];
  return <div className="plan-summary">{rows.map(([label, value]) => <p key={label}><strong>{label}:</strong> {value || t.notSet}</p>)}</div>;
}

function buildActivationSteps(plan, missingItems) {
  const steps = ["Check immediate danger. If life safety is at risk, call 911 now.", "Follow official alerts and evacuation orders. Do not wait if conditions are unsafe."];
  if (plan.contacts) steps.push(`Contact your emergency contacts: ${plan.contacts}`); else steps.push("Text or call one trusted person with your location and status.");
  if (plan.meeting) steps.push(`Move toward your meeting place if it is safe: ${plan.meeting}`); else steps.push("Choose a safe meeting place away from hazards before leaving.");
  if (plan.medical) steps.push(`Prioritize medical/accessibility needs: ${plan.medical}`);
  if (plan.transportation) steps.push(`Use your transportation plan: ${plan.transportation}`); else steps.push("Confirm transportation now: own vehicle, rideshare, neighbor, transit, or pickup contact.");
  if (plan.household) steps.push(`Account for household needs: ${plan.household}`);
  if (missingItems.length) steps.push(`If time allows, grab missing essentials: ${missingItems.slice(0, 3).join(", ")}.`);
  steps.push("Keep phone battery low-power, use flashlight instead of candles, and avoid floodwater, downed wires, smoke, or unstable structures.");
  return steps;
}

function Assistant({ t, lang, plan, checked, resources }) {
  const [messages, setMessages] = useState([{ role: "assistant", text: t.askPrompt }]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const sendMessage = async () => { if (!input.trim()) return; const userMessage = { role: "user", text: input.trim() }; setMessages((current) => [...current, userMessage]); setInput(""); const response = await assistantReply(input.trim(), lang, plan, checked, resources); setMessages((current) => [...current, { role: "assistant", text: response }]); };
  const startListening = () => { const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SpeechRecognition) { setMessages((current) => [...current, { role: "assistant", text: "Voice input is not supported in this browser yet." }]); return; } const recognition = new SpeechRecognition(); recognition.lang = lang === "es" ? "es-US" : lang === "ar" ? "ar-SA" : lang === "ko" ? "ko-KR" : lang === "zh" ? "zh-CN" : lang === "ru" ? "ru-RU" : "en-US"; recognition.interimResults = false; recognition.onstart = () => setListening(true); recognition.onend = () => setListening(false); recognition.onresult = (event) => setInput(event.results[0][0].transcript); recognition.start(); };
  return <section className="page assistant-page"><div className="chat-window">{messages.map((message, index) => <div key={index} className={`message ${message.role}`}>{message.text}</div>)}</div><div className="quick-prompts">{["I smell gas", "Power outage", "Wildfire smoke", "Need shelter", "Elder neighbor needs help"].map((q) => <button key={q} onClick={() => setInput(q)}>{q}</button>)}</div><div className="composer"><button className={listening ? "mic listening" : "mic"} onClick={startListening}>🎙</button><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendMessage(); }} placeholder={t.typeMessage} /><button onClick={sendMessage}>{t.send}</button></div><p className="hint">{t.aiNote}</p></section>;
}

async function assistantReply(text, lang, plan, checked, resources) {
  const lower = text.toLowerCase();
  const context = plan?.location ? ` Based on your plan location: ${plan.location}.` : "";
  const nearby = resources?.length ? ` Nearby/saved resource to consider: ${resources[0].name}, ${resources[0].address}.` : "";
  if (lower.includes("gas") || lower.includes("smell")) return `Leave immediately if you smell gas. Do not use switches, flames, elevators, or phones inside. Once outside, call 911 or the gas utility. ${context}`;
  if (lower.includes("power") || lower.includes("outage")) return `Use flashlights, not candles. Keep fridge/freezer closed, unplug sensitive electronics, conserve phone battery, and check on neighbors who rely on powered medical devices.${nearby}`;
  if (lower.includes("fire") || lower.includes("smoke") || lower.includes("wildfire")) return `Stay indoors if safe, close windows, use filtered air if available, avoid outdoor exertion, and prepare to evacuate if alerts change. If ordered to leave, go now.${context}`;
  if (lower.includes("flood") || lower.includes("water")) return "Do not walk or drive through floodwater. Move to higher ground, avoid downed wires, and bring medications, documents, chargers, water, and emergency contacts if evacuating.";
  if (lower.includes("heat") || lower.includes("cool")) return `Drink water, avoid peak heat, use cooling centers if home is unsafe, and check on older adults, infants, outdoor workers, and neighbors without AC.${nearby}`;
  if (lower.includes("shelter") || lower.includes("evac")) return `Take your go-bag, meds, documents, pets, chargers, and contacts. Follow official evacuation routes and use your meeting place if separated: ${plan?.meeting || "not set yet"}.`;
  if (lower.includes("elder") || lower.includes("neighbor") || lower.includes("pet")) return "Check whether they can communicate, move safely, access medication, and evacuate. Pair them with a nearby helper and share status with emergency contacts. Call 911 for immediate danger.";
  if (lower.includes("bag") || lower.includes("go-bag") || lower.includes("kit")) return "Go-bag basics: water, food, flashlight, batteries, phone charger, medications, documents, cash, hygiene items, masks, first aid, pet supplies, and emergency contacts.";
  if (lang === "es") return "Puedo ayudarte con evacuación, calor, humo de incendios, inundaciones, apagones, mascotas, adultos mayores y recursos cercanos. Si hay peligro inmediato, llama al 911.";
  return `I can help with supplies, evacuation, heat, flood, wildfire smoke, power outages, shelters, pets, elder assistance, and nearby resources. For immediate danger, call 911.${context}${nearby}`;
}

function Profile({ t, savedItems, saved, toggleSave, progress, setPage }) {
  return <section className="page"><div className="panel profile-panel"><p className="eyebrow">{t.progress}</p><h2>{progress}%</h2><button className="small-button" onClick={() => setPage("plan")}>{t.plan}</button></div><div className="section-heading"><h3>{t.savedPlaces}</h3><span className="count-pill">{saved.length}</span></div>{savedItems.length === 0 ? <p className="muted">{t.noSaved}</p> : <div className="card-grid">{savedItems.map((resource) => <ResourceCard key={resource.id} resource={resource} saved={saved.includes(resource.id)} toggleSave={toggleSave} t={t} />)}</div>}</section>;
}

function About({ t }) { return <section className="page"><div className="panel"><p className="eyebrow">About</p><h2>{t.appName}</h2><p>{t.aboutText}</p></div></section>; }
