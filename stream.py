import streamlit as st
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import time

# --- Page settings ---
st.set_page_config(page_title="Systemic Risk Monte Carlo Simulator", layout="wide")

# --- Sidebar ---
st.sidebar.title("Simulation Controls")
n_sim = st.sidebar.number_input("Number of Simulations", min_value=100, max_value=50000, value=10000, step=100)
shock_prob = st.sidebar.slider("Initial Shock Probability", min_value=0.001, max_value=0.05, value=0.005, step=0.001, format="%.3f")
model_type = st.sidebar.radio("Choose Model", options=["Traditional", "Blockchain"])
if model_type == "Traditional":
    lgd = st.sidebar.slider("Loss Given Default (LGD)", 0.1, 1.0, 0.6, 0.05)
    liability_reduction = 0.0
else:
    lgd = st.sidebar.slider("Loss Given Default (LGD)", 0.1, 1.0, 0.3, 0.05)
    liability_reduction = st.sidebar.slider("Interbank Liability Reduction (%)", 0.0, 1.0, 0.5, 0.05)

# --- Data Load ---
@st.cache_data
def load_data():
    df = pd.read_csv("banks_data.csv")
    # Calculate capital buffer if missing
    if 'Capital Buffer (€B)' not in df.columns:
        df['Capital Buffer (€B)'] = df['CET1 Ratio (%)'] * df['Total Assets (€B)'] * 0.01
    return df

banks = load_data()
n_banks = banks.shape[0]
bank_names = banks["Bank Name"]

# --- Exposure Matrix ---
def calculate_exposure_matrix(banks, liability_reduction=0.0):
    assets = banks['Interbank Assets (€B)'].values
    liabilities = banks['Interbank Liabilities (€B)'].values
    exposure = np.zeros((n_banks, n_banks))
    total_assets = assets.sum()
    for i in range(n_banks):  # debtor
        for j in range(n_banks):  # creditor
            if i == j:
                exposure[i, j] = 0
            else:
                exp = liabilities[i] * (assets[j] / (total_assets - assets[i]))
                exp *= (1 - liability_reduction)
                exposure[i, j] = exp
    return pd.DataFrame(exposure, columns=bank_names, index=bank_names)

exposure_matrix = calculate_exposure_matrix(banks, liability_reduction)

# --- Simulation ---
def run_simulation(banks, exposure_matrix, lgd, shock_prob, n_sim):
    capital_buffers = banks['Capital Buffer (€B)'].values
    results = []
    n_banks = len(capital_buffers)
    rng = np.random.default_rng(seed=42)
    for _ in range(n_sim):
        failed = np.zeros(n_banks, dtype=bool)
        # Initial random shocks
        initial_shocks = rng.random(n_banks) < shock_prob
        failed[initial_shocks] = True
        # Cascade process
        prev_failed = np.zeros_like(failed)
        while not np.array_equal(failed, prev_failed):
            prev_failed = failed.copy()
            # Calculate losses for healthy banks from failed banks
            losses = exposure_matrix.values[failed].sum(axis=0) * lgd
            # Add up losses for each healthy bank
            failed = failed | (losses > capital_buffers)
        results.append(failed.sum())
    return np.array(results)

# --- Run the simulation (with progress bar) ---
if st.button("Run Simulation"):
    st.info("Running Monte Carlo simulations...")
    start = time.time()
    results = run_simulation(banks, exposure_matrix, lgd, shock_prob, n_sim)
    duration = time.time() - start

    # --- Results Summary ---
    avg_failures = results.mean()
    max_failures = results.max()
    prob_systemic = (results >= 3).mean()
    std_failures = results.std()
    ci_lower = np.percentile(results, 2.5)
    ci_upper = np.percentile(results, 97.5)

    st.success(f"Completed {n_sim} simulations in {duration:.2f} seconds.")
    st.header("Simulation Results Summary")
    st.write(f"**Average Failures:** {avg_failures:.2f}")
    st.write(f"**Maximum Failures:** {max_failures}")
    st.write(f"**Probability of Systemic Event (≥3 failures):** {prob_systemic*100:.2f}%")
    st.write(f"**Standard Deviation:** {std_failures:.2f}")
    st.write(f"**95% Confidence Interval:** [{ci_lower:.2f}, {ci_upper:.2f}]")

    # --- Visualizations ---
    st.subheader("Failure Distribution Histogram")
    fig, ax = plt.subplots(figsize=(8, 4))
    sns.histplot(results, bins=range(0, n_banks+2), kde=False, ax=ax)
    ax.set_xlabel("Number of Bank Failures")
    ax.set_ylabel("Frequency")
    st.pyplot(fig)

    # --- Boxplot ---
    st.subheader("Failures Distribution (Boxplot)")
    fig2, ax2 = plt.subplots(figsize=(4, 4))
    sns.boxplot(y=results, ax=ax2)
    ax2.set_ylabel("Number of Failures")
    st.pyplot(fig2)

    # --- Download Option ---
    result_df = pd.DataFrame({"Failures": results})
    st.download_button(
        label="Download Simulation Results as CSV",
        data=result_df.to_csv(index=False),
        file_name=f"{model_type}_simulation_results.csv",
        mime="text/csv"
    )

# --- Exposure Matrix Viewer ---
st.header("Exposure Matrix")
st.dataframe(exposure_matrix.style.background_gradient(axis=None, cmap="coolwarm"))

# --- Bank Data Viewer ---
with st.expander("Show Bank Data Table"):
    st.dataframe(banks)

# --- Project Overview and Help ---
st.sidebar.markdown("""
---
**Project:** Decentralizing Finance - Systemic Risk Model  
**By:** Naznin Anwar Vadakkathinakath  
**Supervised by:** Prof. Victor J Randall  
**Institution:** Coburg University of Applied Sciences and Arts

- Compares systemic risk in Traditional vs Blockchain banking
- Monte Carlo simulation (10,000+ runs)
- Based on real EU bank data

""")

st.sidebar.info("Select model parameters and run the simulation! See results and download your data.")

# --- Optionally: Add network/cascade visualizations or sensitivity analysis tabs! ---

