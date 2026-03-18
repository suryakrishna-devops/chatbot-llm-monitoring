const MODELS = [
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
  { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
];

export default function ModelSwitcher({ model, onChange, disabled }) {
  return (
    <div style={styles.wrapper}>
      <span style={styles.label}>Model:</span>
      <select
        value={model}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={styles.select}
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  label: {
    color: "#8696a0",
    fontSize: "13px",
  },
  select: {
    background: "#2a3942",
    color: "#e9edef",
    border: "1px solid #3b4a54",
    borderRadius: "6px",
    padding: "4px 8px",
    fontSize: "13px",
    cursor: "pointer",
    outline: "none",
  },
};
