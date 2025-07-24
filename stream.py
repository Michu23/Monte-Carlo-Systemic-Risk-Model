import streamlit as st
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
import time
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots

# Page config
st.set_page_config(
    page_title="Monte Carlo Systemic Risk Model",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for better styling
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        color: #1f77b4;
        text-align: center;
        margin-bottom: 1rem;
    }
    .sub-header {
        font-size: 1.2rem;
        color: #666;
        text-align: center;
        margin-bottom: 2rem;
    }
    .metric-card {
        background-color: #f0f2f6;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid #1f77b4;
    }
    .improvement-positive {
        color: #28a745;
        font-weight: bold;
    }
    .improvement-neutral {
        color: #6c757d;
    }
</style>
""", unsafe_allow_html=True)

# Header
st.markdown('<div class="main-header">Monte Carlo Systemic Risk Model</div>', unsafe_allow_html=True)
st.markdown('<div class="sub-header">Traditional vs Blockchain Banking Systems</div>', unsafe_allow_html=True)

# Helper functions
@st.cache_data
def load_sample_data():
    """Create sample bank data if no file is uploaded"""
    banks = [
        "Deutsche Bank", "BNP Paribas", "HSBC", "Barclays", "Santander",
        "UniCredit", "ING Group", "Société Générale", "Credit Agricole", "Commerzbank"
    ]
    
    np.random.seed(42)
    data = pd.DataFrame({
        'Bank Name': banks,
        'Total Assets (€B)': np.random.uniform(500, 2000, 10),
        'CET1 Ratio (%)': np.random.uniform(12, 18, 10),
        'Interbank Assets (€B)': np.random.uniform(50, 200, 10),
        'Interbank Liabilities (€B)': np.random.uniform(40, 180, 10)
    })
    
    data['Capital Buffer (€B)'] = data['CET1 Ratio (%)'] * data['Total Assets (€B)'] * 0.01
    return data

def build_exposure_matrix(assets, liabilities):
    """Build the interbank exposure matrix"""
    n = len(assets)
    matrix = np.zeros((n, n))
    total_assets = np.sum(assets)
    
    for i in range(n):
        for j in range(n):
            if i != j:
                matrix[i, j] = liabilities[i] * assets[j] / (total_assets - assets[i])
    
    return matrix

def monte_carlo_sim(data, exposure_matrix, lgd, shock_prob, n_sim=1000, model_type="Traditional"):
    """Run Monte Carlo simulation"""
    n_banks = len(data)
    failures_record = []
    
    # Set random seed for reproducibility
    if model_type == "Traditional":
        np.random.seed(42)
    else:
        np.random.seed(44)
    
    # Adjust shock probability for blockchain
    effective_shock_prob = shock_prob
    if model_type == "Blockchain":
        effective_shock_prob = shock_prob * 0.8
    
    # Progress bar
    progress_bar = st.progress(0)
    status_text = st.empty()
    
    for sim in range(n_sim):
        # Update progress
        if sim % max(1, n_sim // 20) == 0:
            progress_bar.progress(sim / n_sim)
            status_text.text(f'Running {model_type} simulation: {sim}/{n_sim}')
        
        # Initial shock
        failed = np.random.rand(n_banks) < effective_shock_prob
        capital = data['Capital Buffer (€B)'].copy()
        
        # Blockchain improvements
        if model_type == "Blockchain":
            capital = capital * 1.1
        
        # Contagion rounds
        round_num = 1
        still_failing = True
        
        while still_failing and round_num <= 10:
            losses = np.zeros(n_banks)
            
            for i, is_failed in enumerate(failed):
                if is_failed:
                    current_losses = exposure_matrix[i] * lgd
                    
                    if model_type == "Blockchain":
                        current_losses *= 0.6
                    
                    losses += current_losses
            
            # Market panic for traditional banking
            if model_type == "Traditional" and round_num > 1:
                panic_factor = 1.0 + (round_num * 0.1)
                losses = losses * panic_factor
            
            new_failed = (losses > capital.values) & (~failed)
            still_failing = np.any(new_failed)
            failed = failed | new_failed
            capital = capital - losses
            round_num += 1
        
        # Record results
        n_failures = np.sum(failed)
        systemic_threshold = st.session_state.get('systemic_threshold', 3)
        systemic_event = n_failures >= systemic_threshold
        failed_banks = np.where(failed)[0].tolist()
        
        failures_record.append((n_failures, systemic_event, failed_banks))
    
    progress_bar.progress(1.0)
    status_text.text(f'{model_type} simulation completed!')
    time.sleep(0.5)
    progress_bar.empty()
    status_text.empty()
    
    return failures_record

def summarize_results(results):
    """Summarize simulation results"""
    failures = [r[0] for r in results]
    systemic_events = [r[1] for r in results]
    
    ci_lower, ci_upper = stats.norm.interval(
        0.95, 
        loc=np.mean(failures), 
        scale=stats.sem(failures)
    )
    
    return {
        'Average Failures': np.mean(failures),
        'Median Failures': np.median(failures),
        'Max Failures': np.max(failures),
        'Std Dev Failures': np.std(failures),
        'Probability Systemic Event': np.mean(systemic_events),
        '95% CI Lower': ci_lower,
        '95% CI Upper': ci_upper,
        'Raw Failures': failures
    }

# Sidebar for parameters
st.sidebar.header("📊 Simulation Parameters")

# File upload
uploaded_file = st.sidebar.file_uploader(
    "Upload Bank Data CSV", 
    type=['csv'],
    help="Upload a CSV file with bank data or use sample data"
)

if uploaded_file is not None:
    try:
        data = pd.read_csv(uploaded_file)
        st.sidebar.success("✅ Data loaded successfully!")
    except Exception as e:
        st.sidebar.error(f"❌ Error loading file: {str(e)}")
        data = load_sample_data()
else:
    data = load_sample_data()
    st.sidebar.info("ℹ️ Using sample data")

# Simulation parameters
st.sidebar.subheader("Simulation Settings")

shock_prob = st.sidebar.slider(
    "Initial Shock Probability (%)",
    min_value=1.0,
    max_value=10.0,
    value=3.0,
    step=0.5,
    help="Probability that a bank experiences an initial shock"
) / 100

n_sim = st.sidebar.selectbox(
    "Number of Simulations",
    options=[500, 1000, 2000, 5000, 10000],
    index=1,
    help="More simulations = more accurate results but longer runtime"
)

systemic_threshold = st.sidebar.number_input(
    "Systemic Event Threshold",
    min_value=1,
    max_value=len(data),
    value=3,
    help="Minimum number of bank failures to constitute a systemic event"
)

st.session_state['systemic_threshold'] = systemic_threshold

# Model parameters
st.sidebar.subheader("Model Parameters")

col1, col2 = st.sidebar.columns(2)
with col1:
    trad_lgd = st.number_input("Traditional LGD", value=0.6, min_value=0.1, max_value=1.0, step=0.05)
with col2:
    bc_lgd = st.number_input("Blockchain LGD", value=0.3, min_value=0.1, max_value=1.0, step=0.05)

# Main content
tab1, tab2, tab3 = st.tabs(["📈 Results", "📊 Data Overview", "ℹ️ About"])

with tab2:
    st.subheader("Bank Data Overview")
    st.dataframe(data, use_container_width=True)
    
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Number of Banks", len(data))
    with col2:
        st.metric("Avg Total Assets (€B)", f"{data['Total Assets (€B)'].mean():.1f}")
    with col3:
        st.metric("Avg CET1 Ratio (%)", f"{data['CET1 Ratio (%)'].mean():.1f}")

with tab3:
    st.subheader("About This Model")
    st.markdown("""
    **Author:** Naznin Anwar Vadakkathinakath  
    **Institution:** Coburg University of Applied Sciences and Arts
    
    This Monte Carlo simulation compares systemic risk between traditional and blockchain-based banking systems.
    
    **Key Features:**
    - **Traditional Banking:** Higher loss given default (LGD), market panic effects, full interbank exposures
    - **Blockchain Banking:** Lower LGD, reduced contagion effects, better transparency and risk management
    
    **Methodology:**
    1. Generate initial shocks based on specified probability
    2. Model contagion through interbank exposures
    3. Apply different risk characteristics for each system type
    4. Record bank failures and systemic events across simulations
    """)

with tab1:
    st.subheader("Simulation Results")
    
    # Run simulation button
    if st.button("🚀 Run Simulation", type="primary", use_container_width=True):
        
        # Build exposure matrices
        with st.spinner("Building exposure matrices..."):
            trad_exposure = build_exposure_matrix(
                data['Interbank Assets (€B)'], 
                data['Interbank Liabilities (€B)']
            )
            bc_exposure = trad_exposure * 0.5  # 50% reduction for blockchain
        
        # Run simulations
        col1, col2 = st.columns(2)
        
        with col1:
            st.info("🏛️ Running Traditional Banking Simulation...")
            trad_results = monte_carlo_sim(
                data, trad_exposure, trad_lgd, shock_prob, n_sim, "Traditional"
            )
        
        with col2:
            st.info("⛓️ Running Blockchain Banking Simulation...")
            bc_results = monte_carlo_sim(
                data, bc_exposure, bc_lgd, shock_prob, n_sim, "Blockchain"
            )
        
        # Summarize results
        trad_summary = summarize_results(trad_results)
        bc_summary = summarize_results(bc_results)
        
        # Display key metrics
        st.subheader("📊 Key Results")
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            improvement = (1 - bc_summary['Average Failures'] / trad_summary['Average Failures']) * 100 if trad_summary['Average Failures'] > 0 else 0
            st.metric(
                "Average Failures",
                f"{bc_summary['Average Failures']:.2f}",
                delta=f"-{improvement:.1f}%",
                delta_color="inverse"
            )
        
        with col2:
            max_improvement = trad_summary['Max Failures'] - bc_summary['Max Failures']
            st.metric(
                "Maximum Failures",
                f"{bc_summary['Max Failures']:.0f}",
                delta=f"-{max_improvement:.0f}",
                delta_color="inverse"
            )
        
        with col3:
            systemic_improvement = (1 - bc_summary['Probability Systemic Event'] / trad_summary['Probability Systemic Event']) * 100 if trad_summary['Probability Systemic Event'] > 0 else 0
            st.metric(
                "Systemic Event Probability",
                f"{bc_summary['Probability Systemic Event']*100:.2f}%",
                delta=f"-{systemic_improvement:.1f}%",
                delta_color="inverse"
            )
        
        with col4:
            volatility_improvement = (1 - bc_summary['Std Dev Failures'] / trad_summary['Std Dev Failures']) * 100 if trad_summary['Std Dev Failures'] > 0 else 0
            st.metric(
                "Volatility (Std Dev)",
                f"{bc_summary['Std Dev Failures']:.2f}",
                delta=f"-{volatility_improvement:.1f}%",
                delta_color="inverse"
            )
        
        # Detailed results table
        st.subheader("📋 Detailed Comparison")
        
        results_df = pd.DataFrame({
            'Metric': ['Average Failures', 'Median Failures', 'Maximum Failures', 
                      'Standard Deviation', 'Systemic Event Probability (%)', 
                      '95% CI Lower', '95% CI Upper'],
            'Traditional': [
                f"{trad_summary['Average Failures']:.4f}",
                f"{trad_summary['Median Failures']:.1f}",
                f"{trad_summary['Max Failures']:.0f}",
                f"{trad_summary['Std Dev Failures']:.4f}",
                f"{trad_summary['Probability Systemic Event']*100:.2f}%",
                f"{trad_summary['95% CI Lower']:.4f}",
                f"{trad_summary['95% CI Upper']:.4f}"
            ],
            'Blockchain': [
                f"{bc_summary['Average Failures']:.4f}",
                f"{bc_summary['Median Failures']:.1f}",
                f"{bc_summary['Max Failures']:.0f}",
                f"{bc_summary['Std Dev Failures']:.4f}",
                f"{bc_summary['Probability Systemic Event']*100:.2f}%",
                f"{bc_summary['95% CI Lower']:.4f}",
                f"{bc_summary['95% CI Upper']:.4f}"
            ]
        })
        
        st.dataframe(results_df, use_container_width=True)
        
        # Statistical significance
        st.subheader("📈 Statistical Analysis")
        
        trad_failures = trad_summary['Raw Failures']
        bc_failures = bc_summary['Raw Failures']
        
        t_stat, p_value = stats.ttest_ind(trad_failures, bc_failures)
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("T-statistic", f"{t_stat:.4f}")
        with col2:
            st.metric("P-value", f"{p_value:.6f}")
        with col3:
            significance = "Yes" if p_value < 0.05 else "No"
            st.metric("Statistically Significant", significance)
        
        # Visualizations
        st.subheader("📊 Visualizations")
        
        # Create interactive plots with Plotly
        fig = make_subplots(
            rows=2, cols=2,
            subplot_titles=('Distribution of Bank Failures', 'Cumulative Probability', 
                          'Box Plot Comparison', 'Systemic Event Probability'),
            specs=[[{"secondary_y": False}, {"secondary_y": False}],
                   [{"secondary_y": False}, {"secondary_y": False}]]
        )
        
        # Histogram
        max_failures = int(max(max(trad_failures), max(bc_failures)))
        nbins = min(max_failures + 1, 50)  # Cap at 50 bins for better visualization
        
        fig.add_trace(
            go.Histogram(x=trad_failures, name='Traditional', opacity=0.7, 
                        nbinsx=nbins, histnorm='probability'),
            row=1, col=1
        )
        fig.add_trace(
            go.Histogram(x=bc_failures, name='Blockchain', opacity=0.7,
                        nbinsx=nbins, histnorm='probability'),
            row=1, col=1
        )
        
        # ECDF
        trad_sorted = np.sort(trad_failures)
        bc_sorted = np.sort(bc_failures)
        trad_y = np.arange(1, len(trad_sorted)+1) / len(trad_sorted)
        bc_y = np.arange(1, len(bc_sorted)+1) / len(bc_sorted)
        
        fig.add_trace(
            go.Scatter(x=trad_sorted, y=trad_y, mode='lines', name='Traditional ECDF'),
            row=1, col=2
        )
        fig.add_trace(
            go.Scatter(x=bc_sorted, y=bc_y, mode='lines', name='Blockchain ECDF'),
            row=1, col=2
        )
        
        # Box plots
        fig.add_trace(
            go.Box(y=trad_failures, name='Traditional', boxpoints='outliers'),
            row=2, col=1
        )
        fig.add_trace(
            go.Box(y=bc_failures, name='Blockchain', boxpoints='outliers'),
            row=2, col=1
        )
        
        # Bar chart
        fig.add_trace(
            go.Bar(x=['Traditional', 'Blockchain'], 
                  y=[trad_summary['Probability Systemic Event']*100, 
                     bc_summary['Probability Systemic Event']*100],
                  name='Systemic Event %'),
            row=2, col=2
        )
        
        # Update layout with proper axis labels
        fig.update_xaxes(title_text="Number of Failures", row=1, col=1)
        fig.update_yaxes(title_text="Probability", row=1, col=1)
        fig.update_xaxes(title_text="Number of Failures", row=1, col=2)
        fig.update_yaxes(title_text="Cumulative Probability", row=1, col=2)
        fig.update_yaxes(title_text="Number of Failures", row=2, col=1)
        fig.update_xaxes(title_text="System Type", row=2, col=2)
        fig.update_yaxes(title_text="Probability (%)", row=2, col=2)
        
        fig.update_layout(height=800, showlegend=True, title_text="Simulation Results Comparison")
        st.plotly_chart(fig, use_container_width=True)
        
        # Download results
        st.subheader("💾 Download Results")
        
        csv = results_df.to_csv(index=False)
        st.download_button(
            label="📄 Download Results as CSV",
            data=csv,
            file_name=f"simulation_results_{int(time.time())}.csv",
            mime="text/csv"
        )
        
        st.success("✅ Simulation completed successfully!")

# Footer
st.markdown("---")
st.markdown(
    "<div style='text-align: center; color: #666;'>"
    "Monte Carlo Systemic Risk Model | Developed for Academic Research"
    "</div>", 
    unsafe_allow_html=True
)