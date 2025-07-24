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

# Configure the web page settings and appearance
st.set_page_config(
    page_title="Monte Carlo Systemic Risk Model",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Add custom styling to make the interface more attractive
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

# Display the main title of the application
st.markdown('<div class="main-header">Monte Carlo Systemic Risk Model</div>', unsafe_allow_html=True)
# Display the subtitle explaining what we're comparing
st.markdown('<div class="sub-header">Traditional vs Blockchain Banking Systems</div>', unsafe_allow_html=True)

# Helper functions section - these are reusable pieces of code
@st.cache_data
def load_banking_data_from_file():
    """Load bank information from the CSV file and prepare it for analysis"""

    # Read the bank data from the CSV file
    banking_data = pd.read_csv('banks_data.csv')
    
    # Check if capital buffer column exists, if not calculate it
    # Capital buffer = how much money banks have as safety cushion
    if 'Capital Buffer (€B)' not in banking_data.columns:
        # Calculate capital buffer as percentage of total assets
        banking_data['Capital Buffer (€B)'] = banking_data['CET1 Ratio (%)'] * banking_data['Total Assets (€B)'] * 0.01
    
    # Return the prepared data
    return banking_data


def create_bank_connection_matrix(bank_assets_list, bank_liabilities_list):
    """Create a matrix showing how much money each bank owes to every other bank"""
    
    # Get the number of banks we're working with
    number_of_banks = len(bank_assets_list)
    
    # Create an empty matrix (table) filled with zeros
    connection_matrix = np.zeros((number_of_banks, number_of_banks))
    
    # Calculate the total assets of all banks combined
    total_system_assets = np.sum(bank_assets_list)
    
    # Fill in the matrix - for each pair of banks, calculate how much one owes the other
    for bank_i in range(number_of_banks):
        for bank_j in range(number_of_banks):
            # A bank doesn't owe money to itself
            if bank_i != bank_j:
                # Calculate exposure based on relative size of banks
                connection_matrix[bank_i, bank_j] = bank_liabilities_list[bank_i] * bank_assets_list[bank_j] / (total_system_assets - bank_assets_list[bank_i])
    
    # Return the completed matrix
    return connection_matrix

def run_monte_carlo_banking_simulation(banking_data, bank_connection_matrix, loss_when_bank_fails, initial_crisis_probability, number_of_simulations=1000, banking_system_type="Traditional"):
    """Run thousands of simulations to see how banking crises spread"""
    
    # Get the number of banks in our system
    total_number_of_banks = len(banking_data)
    
    # Create a list to store results from each simulation
    simulation_results_list = []
    
    # Set random number generator seed for consistent results
    # Traditional and Blockchain use different seeds to show different outcomes
    if banking_system_type == "Traditional":
        np.random.seed(42)  # Seed for traditional banking
    else:
        np.random.seed(44)  # Seed for blockchain banking
    
    # Adjust crisis probability for blockchain (blockchain is more stable)
    adjusted_crisis_probability = initial_crisis_probability
    if banking_system_type == "Blockchain":
        # Blockchain reduces crisis probability by 20%
        adjusted_crisis_probability = initial_crisis_probability * 0.8
    
    # Create progress bar to show simulation progress
    progress_indicator = st.progress(0)
    status_display = st.empty()
    
    # Run the specified number of simulations
    for current_simulation in range(number_of_simulations):
        
        # Update progress bar every few simulations
        if current_simulation % max(1, number_of_simulations // 20) == 0:
            # Update progress bar
            progress_indicator.progress(current_simulation / number_of_simulations)
            # Update status text
            status_display.text(f'Running {banking_system_type} simulation: {current_simulation}/{number_of_simulations}')
        
        # Step 1: Determine which banks fail from initial crisis
        # Create random numbers for each bank and compare to crisis probability
        banks_failed_initially = np.random.rand(total_number_of_banks) < adjusted_crisis_probability
        
        # Get each bank's capital buffer (safety money)
        bank_capital_remaining = banking_data['Capital Buffer (€B)'].copy()
        
        # Blockchain banking improvements - banks have 10% more capital
        if banking_system_type == "Blockchain":
            bank_capital_remaining = bank_capital_remaining * 1.1
        
        # Step 2: Model the contagion (crisis spreading)
        contagion_round_number = 1
        crisis_still_spreading = True
        
        # Continue spreading crisis until no new banks fail (max 10 rounds)
        while crisis_still_spreading and contagion_round_number <= 10:
            
            # Calculate losses each bank suffers this round
            losses_this_round = np.zeros(total_number_of_banks)
            
            # For each failed bank, calculate losses it causes to others
            for bank_index, has_this_bank_failed in enumerate(banks_failed_initially):
                if has_this_bank_failed:
                    # Calculate losses this failed bank causes to all others
                    losses_caused_by_this_bank = bank_connection_matrix[bank_index] * loss_when_bank_fails
                    
                    # Blockchain reduces contagion losses by 40%
                    if banking_system_type == "Blockchain":
                        losses_caused_by_this_bank *= 0.6
                    
                    # Add these losses to the total
                    losses_this_round += losses_caused_by_this_bank
            
            # Traditional banking suffers from market panic (losses get worse over time)
            if banking_system_type == "Traditional" and contagion_round_number > 1:
                # Panic factor increases with each round
                market_panic_multiplier = 1.0 + (contagion_round_number * 0.1)
                losses_this_round = losses_this_round * market_panic_multiplier
            
            # Determine which banks fail this round due to losses
            newly_failed_banks = (losses_this_round > bank_capital_remaining.values) & (~banks_failed_initially)
            
            # Check if any new banks failed (crisis still spreading)
            crisis_still_spreading = np.any(newly_failed_banks)
            
            # Update the list of failed banks
            banks_failed_initially = banks_failed_initially | newly_failed_banks
            
            # Reduce remaining capital by losses suffered
            bank_capital_remaining = bank_capital_remaining - losses_this_round
            
            # Move to next contagion round
            contagion_round_number += 1
        
        # Step 3: Record results of this simulation
        total_banks_failed = np.sum(banks_failed_initially)
        
        # Define systemic crisis as 3 or more bank failures
        systemic_crisis_threshold = 3
        is_systemic_crisis = total_banks_failed >= systemic_crisis_threshold
        
        # Get list of which specific banks failed
        list_of_failed_banks = np.where(banks_failed_initially)[0].tolist()
        
        # Store results from this simulation
        simulation_results_list.append((total_banks_failed, is_systemic_crisis, list_of_failed_banks))
    
    # Update progress bar to show completion
    progress_indicator.progress(1.0)
    status_display.text(f'{banking_system_type} simulation completed!')
    
    # Brief pause to show completion
    time.sleep(0.5)
    
    # Clear progress indicators
    progress_indicator.empty()
    status_display.empty()
    
    # Return all simulation results
    return simulation_results_list

def calculate_summary_statistics(simulation_results_list):
    """Calculate summary statistics from all the simulation results"""
    
    # Extract the number of failures from each simulation
    failures_per_simulation = [result[0] for result in simulation_results_list]
    
    # Extract whether each simulation was a systemic crisis
    systemic_crisis_occurred = [result[1] for result in simulation_results_list]
    
    # Calculate and return summary statistics
    return {
        'Average Failures': np.mean(failures_per_simulation),
        'Max Failures': np.max(failures_per_simulation),
        'Std Dev Failures': np.std(failures_per_simulation),
        'Probability Systemic Event': np.mean(systemic_crisis_occurred),
        'Raw Failures': failures_per_simulation
    }

# Create sidebar for user inputs and controls
st.sidebar.header("📊 Project: Baby's Project")

# Load the banking data from file
banking_data = load_banking_data_from_file()
print(banking_data)

# Show success message with number of banks loaded
st.sidebar.success(f"✅ Loaded {len(banking_data)} banks from banks_data.csv")

# Section for simulation settings
st.sidebar.subheader("Simulation Settings")

# Slider for initial crisis probability
initial_shock_percentage = st.sidebar.slider(
    "Initial Shock Probability (%)",
    min_value=1.0,
    max_value=10.0,
    value=3.0,
    step=0.5,
    help="Probability that a bank experiences an initial shock"
) / 100  # Convert percentage to decimal

# Dropdown for number of simulations to run
number_of_simulations_to_run = st.sidebar.selectbox(
    "Number of Simulations",
    options=[50000, 100000, 200000, 500000, 1000000],
    index=1,
    help="More simulations = more accurate results but longer runtime"
)

# Section for model parameters
st.sidebar.subheader("Model Parameters")

# Create two columns for loss parameters
column1, column2 = st.sidebar.columns(2)

# Input for traditional banking loss rate when bank fails
with column1:
    traditional_loss_rate = st.number_input("Traditional LGD", value=0.6, min_value=0.1, max_value=1.0, step=0.05)

# Input for blockchain banking loss rate when bank fails
with column2:
    blockchain_loss_rate = st.number_input("Blockchain LGD", value=0.3, min_value=0.1, max_value=1.0, step=0.05)

# Create main content tabs
results_tab, data_overview_tab = st.tabs(["📈 Results", "📊😭 Data Overview"])

# Data Overview Tab - show the banking data
with data_overview_tab:
    st.subheader("Bank Data Overview")
    
    # Display the banking data in a table
    st.dataframe(banking_data, use_container_width=True)
    
    # Create three columns for summary statistics
    metric_col1, metric_col2, metric_col3 = st.columns(3)
    
    # Show number of banks
    with metric_col1:
        st.metric("Number of Banks", len(banking_data))
    
    # Show average total assets
    with metric_col2:
        st.metric("Avg Total Assets (€B)", f"{banking_data['Total Assets (€B)'].mean():.1f}")
    
    # Show average capital ratio
    with metric_col3:
        st.metric("Avg CET1 Ratio (%)", f"{banking_data['CET1 Ratio (%)'].mean():.1f}")

# Results Tab - main simulation interface
with results_tab:
    st.subheader("Simulation Results")
    
    # Main button to start the simulation
    if st.button("🚀 Run Simulation", type="primary", use_container_width=True):
        
        # Step 1: Build the bank connection matrices
        with st.spinner("Building exposure matrices..."):
            # Create matrix for traditional banking (full connections)
            traditional_connection_matrix = create_bank_connection_matrix(
                banking_data['Interbank Assets (€B)'], 
                banking_data['Interbank Liabilities (€B)']
            )
            
            # Create matrix for blockchain banking (50% reduced connections)
            blockchain_connection_matrix = traditional_connection_matrix * 0.5
        
        # Step 2: Run simulations for both banking systems
        simulation_col1, simulation_col2 = st.columns(2)
        
        # Run traditional banking simulation
        with simulation_col1:
            st.info("🏛️ Running Traditional Banking Simulation...")
            traditional_simulation_results = run_monte_carlo_banking_simulation(
                banking_data, traditional_connection_matrix, traditional_loss_rate, 
                initial_shock_percentage, number_of_simulations_to_run, "Traditional"
            )
        
        # Run blockchain banking simulation
        with simulation_col2:
            st.info("⛓️ Running Blockchain Banking Simulation...")
            blockchain_simulation_results = run_monte_carlo_banking_simulation(
                banking_data, blockchain_connection_matrix, blockchain_loss_rate, 
                initial_shock_percentage, number_of_simulations_to_run, "Blockchain"
            )
        
        # Step 3: Calculate summary statistics from simulation results
        traditional_summary_stats = calculate_summary_statistics(traditional_simulation_results)
        blockchain_summary_stats = calculate_summary_statistics(blockchain_simulation_results)

        # Step 3.5: Comprehensive Failure Impact Analysis
        st.subheader("🔍 Absolute Failure Impact Analysis")

        # Get failure data for analysis
        traditional_failure_counts = [result[0] for result in traditional_simulation_results]
        blockchain_failure_counts = [result[0] for result in blockchain_simulation_results]

        # Calculate total absolute failures across ALL simulations
        total_traditional_failures = sum(traditional_failure_counts)
        total_blockchain_failures = sum(blockchain_failure_counts)

        # Calculate systemic crisis counts
        traditional_systemic_count = sum([result[1] for result in traditional_simulation_results])
        blockchain_systemic_count = sum([result[1] for result in blockchain_simulation_results])

        # Show dramatic impact comparison at the top
        st.subheader("🚨 System Impact Comparison")

        impact_col1, impact_col2, impact_col3 = st.columns(3)

        with impact_col1:
            st.metric(
                "Total Bank Failures",
                f"Traditional: {total_traditional_failures:,}",
                help="Total number of bank failures across all simulations"
            )
            st.metric(
                "Blockchain Failures",
                f"{total_blockchain_failures:,}",
                delta=f"-{total_traditional_failures - total_blockchain_failures:,} fewer",
                delta_color="inverse"
            )

        with impact_col2:
            failure_reduction = ((total_traditional_failures - total_blockchain_failures) / total_traditional_failures * 100) if total_traditional_failures > 0 else 0
            st.metric(
                "Failure Reduction",
                f"{failure_reduction:.1f}%",
                help="How much blockchain reduces total failures"
            )
            
            crisis_reduction = ((traditional_systemic_count - blockchain_systemic_count) / traditional_systemic_count * 100) if traditional_systemic_count > 0 else 0
            st.metric(
                "Crisis Reduction",
                f"{crisis_reduction:.1f}%",
                help="How much blockchain reduces systemic crises"
            )

        with impact_col3:
            st.metric(
                "Systemic Crises Prevented",
                f"{traditional_systemic_count - blockchain_systemic_count:,}",
                help="Number of major financial crises prevented by blockchain"
            )
            
            avg_failure_rate_traditional = total_traditional_failures / len(traditional_failure_counts)
            avg_failure_rate_blockchain = total_blockchain_failures / len(blockchain_failure_counts)
            st.metric(
                "Avg Failures per Simulation",
                f"Traditional: {avg_failure_rate_traditional:.2f}",
            )
            st.metric(
                "Blockchain",
                f"{avg_failure_rate_blockchain:.2f}",
                delta=f"-{avg_failure_rate_traditional - avg_failure_rate_blockchain:.2f}",
                delta_color="inverse"
            )

        # Detailed breakdown in expandable section
        with st.expander("📊 Detailed Absolute Failure Breakdown"):
            
            breakdown_col1, breakdown_col2 = st.columns(2)
            
            # TRADITIONAL BANKING DETAILED BREAKDOWN
            with breakdown_col1:
                st.subheader("🏛️ Traditional Banking Impact")
                
                # Calculate failure statistics
                zero_failures_traditional = traditional_failure_counts.count(0)
                some_failures_traditional = len(traditional_failure_counts) - zero_failures_traditional
                
                st.write("**Absolute Impact Numbers:**")
                st.write(f"- **Total simulations run:** {len(traditional_failure_counts):,}")
                st.write(f"- **Total bank failures:** {total_traditional_failures:,}")
                st.write(f"- **Systemic crises:** {traditional_systemic_count:,}")
                st.write(f"- **Simulations with failures:** {some_failures_traditional:,}")
                st.write(f"- **Simulations with no failures:** {zero_failures_traditional:,}")
                st.write(f"- **Maximum failures in one simulation:** {max(traditional_failure_counts):,}")
                
                # Show severity distribution
                st.write("**Failure Severity Distribution:**")
                severity_data_traditional = {
                    "No failures (0)": traditional_failure_counts.count(0),
                    "Minor crisis (1-2)": sum(1 for x in traditional_failure_counts if 1 <= x <= 2),
                    "Systemic crisis (3+)": sum(1 for x in traditional_failure_counts if x >= 3),
                }
                
                for severity, count in severity_data_traditional.items():
                    percentage = (count / len(traditional_failure_counts)) * 100
                    st.write(f"- **{severity}:** {count:,} simulations ({percentage:.1f}%)")
            
            # BLOCKCHAIN BANKING DETAILED BREAKDOWN
            with breakdown_col2:
                st.subheader("⛓️ Blockchain Banking Impact")
                
                # Calculate failure statistics
                zero_failures_blockchain = blockchain_failure_counts.count(0)
                some_failures_blockchain = len(blockchain_failure_counts) - zero_failures_blockchain
                
                st.write("**Absolute Impact Numbers:**")
                st.write(f"- **Total simulations run:** {len(blockchain_failure_counts):,}")
                st.write(f"- **Total bank failures:** {total_blockchain_failures:,}")
                st.write(f"- **Systemic crises:** {blockchain_systemic_count:,}")
                st.write(f"- **Simulations with failures:** {some_failures_blockchain:,}")
                st.write(f"- **Simulations with no failures:** {zero_failures_blockchain:,}")
                st.write(f"- **Maximum failures in one simulation:** {max(blockchain_failure_counts):,}")
                
                # Show severity distribution
                st.write("**Failure Severity Distribution:**")
                severity_data_blockchain = {
                    "No failures (0)": blockchain_failure_counts.count(0),
                    "Minor crisis (1-2)": sum(1 for x in blockchain_failure_counts if 1 <= x <= 2),
                    "Systemic crisis (3+)": sum(1 for x in blockchain_failure_counts if x >= 3),
                }
                
                for severity, count in severity_data_blockchain.items():
                    percentage = (count / len(blockchain_failure_counts)) * 100
                    st.write(f"- **{severity}:** {count:,} simulations ({percentage:.1f}%)")

        # Absolute Failure Frequency Comparison
        st.subheader("📈 Absolute Failure Frequency Analysis")

        # Create comprehensive comparison table showing absolute numbers
        max_failures_overall = max(max(traditional_failure_counts), max(blockchain_failure_counts))
        comparison_data = []

        # Calculate absolute frequencies for each failure count
        for failure_count in range(min(max_failures_overall + 1, 25)):  # Limit to 25 for readability
            trad_absolute = traditional_failure_counts.count(failure_count)
            bc_absolute = blockchain_failure_counts.count(failure_count)
            absolute_difference = trad_absolute - bc_absolute
            
            # Calculate what this means in terms of total bank failures
            total_failures_traditional_this_level = failure_count * trad_absolute
            total_failures_blockchain_this_level = failure_count * bc_absolute
            bank_failures_prevented = total_failures_traditional_this_level - total_failures_blockchain_this_level
            
            comparison_data.append({
                'Failures per Simulation': failure_count,
                'Traditional Simulations': f"{trad_absolute:,}",
                'Blockchain Simulations': f"{bc_absolute:,}",
                'Difference (Trad - BC)': f"{absolute_difference:,}",
                'Total Bank Failures (Traditional)': f"{total_failures_traditional_this_level:,}",
                'Total Bank Failures (Blockchain)': f"{total_failures_blockchain_this_level:,}",
                'Bank Failures Prevented': f"{bank_failures_prevented:,}"
            })

        comparison_df = pd.DataFrame(comparison_data)
        st.dataframe(comparison_df, use_container_width=True)

        # Highlight key insights
        st.subheader("💡 Key Insights from Absolute Numbers")

        insights_col1, insights_col2 = st.columns(2)

        with insights_col1:
            st.write("**🚨 Traditional Banking Risks:**")
            worst_case_traditional = max(traditional_failure_counts)
            frequent_failures_traditional = sum(1 for x in traditional_failure_counts if x >= 1)
            st.write(f"- In worst case: **{worst_case_traditional} banks failed** in single crisis")
            st.write(f"- Failures occurred in **{frequent_failures_traditional:,} simulations**")
            st.write(f"- Average of **{avg_failure_rate_traditional:.2f} bank failures** per simulation")
            st.write(f"- **{traditional_systemic_count:,} major systemic crises** occurred")

        with insights_col2:
            st.write("**✅ Blockchain Banking Stability:**")
            worst_case_blockchain = max(blockchain_failure_counts)
            frequent_failures_blockchain = sum(1 for x in blockchain_failure_counts if x >= 1)
            st.write(f"- In worst case: **{worst_case_blockchain} banks failed** in single crisis")
            st.write(f"- Failures occurred in **{frequent_failures_blockchain:,} simulations**")
            st.write(f"- Average of **{avg_failure_rate_blockchain:.2f} bank failures** per simulation")
            st.write(f"- **{blockchain_systemic_count:,} major systemic crises** occurred")

        # Financial Impact Estimation
        st.subheader("💰 Estimated Financial Impact")

        # Assume average bank has €50B in assets (you can adjust this)
        avg_bank_assets = banking_data['Total Assets (€B)'].mean()

        traditional_financial_impact = total_traditional_failures * avg_bank_assets
        blockchain_financial_impact = total_blockchain_failures * avg_bank_assets
        financial_savings = traditional_financial_impact - blockchain_financial_impact

        impact_metric_col1, impact_metric_col2, impact_metric_col3 = st.columns(3)

        with impact_metric_col1:
            st.metric(
                "Traditional System Cost",
                f"€{traditional_financial_impact:,.0f}B",
                help="Estimated total assets at risk from failed banks"
            )

        with impact_metric_col2:
            st.metric(
                "Blockchain System Cost",
                f"€{blockchain_financial_impact:,.0f}B",
                help="Estimated total assets at risk from failed banks"
            )

        with impact_metric_col3:
            st.metric(
                "Potential Savings",
                f"€{financial_savings:,.0f}B",
                delta=f"€{financial_savings:,.0f}B saved",
                delta_color="inverse",
                help="Financial losses prevented by blockchain banking"
            )

        # Sample specific simulation results
        st.subheader("🔍 Sample Simulation Results")

        sample_col1, sample_col2 = st.columns(2)

        with sample_col1:
            st.write("**Traditional Banking - First 10 Simulations:**")
            for i in range(min(10, len(traditional_simulation_results))):
                failures, is_systemic, failed_banks = traditional_simulation_results[i]
                if is_systemic:
                    st.write(f"🚨 **Simulation {i+1}: {failures} banks failed - SYSTEMIC CRISIS**")
                elif failures > 0:
                    st.write(f"⚠️ Simulation {i+1}: {failures} banks failed")
                else:
                    st.write(f"✅ Simulation {i+1}: {failures} banks failed")

        with sample_col2:
            st.write("**Blockchain Banking - First 10 Simulations:**")
            for i in range(min(10, len(blockchain_simulation_results))):
                failures, is_systemic, failed_banks = blockchain_simulation_results[i]
                if is_systemic:
                    st.write(f"🚨 **Simulation {i+1}: {failures} banks failed - SYSTEMIC CRISIS**")
                elif failures > 0:
                    st.write(f"⚠️ Simulation {i+1}: {failures} banks failed")
                else:
                    st.write(f"✅ Simulation {i+1}: {failures} banks failed")
        
        # Step 4: Display key results in metric cards
        st.subheader("📊 Key Results")
        
        # Create five columns for key metrics
        metric_col1, metric_col2, metric_col3, metric_col4, metric_col5 = st.columns(5)
        
        # Show average failures with improvement percentage
        with metric_col1:
            # Calculate improvement percentage for blockchain vs traditional
            if traditional_summary_stats['Average Failures'] > 0:
                failure_improvement_percentage = (1 - blockchain_summary_stats['Average Failures'] / traditional_summary_stats['Average Failures']) * 100
            else:
                failure_improvement_percentage = 0
                
            st.metric(
                "Average Failures",
                f"{blockchain_summary_stats['Average Failures']:.2f}",
                delta=f"-{failure_improvement_percentage:.1f}%",
                delta_color="inverse"
            )
        
        # Show systemic crisis probability with improvement
        with metric_col2:
            # Calculate improvement in systemic crisis probability
            if traditional_summary_stats['Probability Systemic Event'] > 0:
                systemic_improvement_percentage = (1 - blockchain_summary_stats['Probability Systemic Event'] / traditional_summary_stats['Probability Systemic Event']) * 100
            else:
                systemic_improvement_percentage = 0
                
            st.metric(
                "Systemic Event Probability",
                f"{blockchain_summary_stats['Probability Systemic Event']*100:.2f}%",
                delta=f"-{systemic_improvement_percentage:.1f}%",
                delta_color="inverse"
            )
        
        # Show volatility (standard deviation) with improvement
        with metric_col3:
            # Calculate improvement in volatility
            if traditional_summary_stats['Std Dev Failures'] > 0:
                volatility_improvement_percentage = (1 - blockchain_summary_stats['Std Dev Failures'] / traditional_summary_stats['Std Dev Failures']) * 100
            else:
                volatility_improvement_percentage = 0
                
            st.metric(
                "Volatility (Std Dev)",
                f"{blockchain_summary_stats['Std Dev Failures']:.2f}",
                delta=f"-{volatility_improvement_percentage:.1f}%",
                delta_color="inverse"
            )
        
        # Step 5: Create detailed comparison table
        st.subheader("📋 Detailed Comparison")
        
        # Create dataframe with detailed results
        detailed_comparison_table = pd.DataFrame({
            'Metric': ['Average Failures', 'Maximum Failures', 
                      'Standard Deviation', 'Systemic Event Probability (%)'],
            'Traditional': [
                f"{traditional_summary_stats['Average Failures']:.4f}",
                f"{traditional_summary_stats['Max Failures']:.0f}",
                f"{traditional_summary_stats['Std Dev Failures']:.4f}",
                f"{traditional_summary_stats['Probability Systemic Event']*100:.2f}%"
            ],
            'Blockchain': [
                f"{blockchain_summary_stats['Average Failures']:.4f}",
                f"{blockchain_summary_stats['Max Failures']:.0f}",
                f"{blockchain_summary_stats['Std Dev Failures']:.4f}",
                f"{blockchain_summary_stats['Probability Systemic Event']*100:.2f}%"
            ]
        })
        
        # Display the comparison table
        st.dataframe(detailed_comparison_table, use_container_width=True)
        
        # Step 6: Create visualizations
        st.subheader("📊 Visualizations")

        # Get failure data for creating charts
        traditional_failure_counts = traditional_summary_stats['Raw Failures']
        blockchain_failure_counts = blockchain_summary_stats['Raw Failures']
        
        # Create interactive plots using Plotly
        # Set up subplot structure (2 rows, 2 columns)
        visualization_figure = make_subplots(
            rows=2, cols=2,
            subplot_titles=('Distribution of Bank Failures', 'Cumulative Probability', 
                          'Box Plot Comparison', 'Systemic Event Probability'),
            specs=[[{"secondary_y": False}, {"secondary_y": False}],
                   [{"secondary_y": False}, {"secondary_y": False}]]
        )
        
        # Chart 1: Histogram showing distribution of failures
        maximum_failures_observed = int(max(max(traditional_failure_counts), max(blockchain_failure_counts)))
        number_of_histogram_bins = min(maximum_failures_observed + 1, 50)  # Limit bins for better display
        
        # Add traditional banking histogram
        visualization_figure.add_trace(
            go.Histogram(x=traditional_failure_counts, name='Traditional', opacity=0.7, 
                        nbinsx=number_of_histogram_bins, histnorm='probability'),
            row=1, col=1
        )
        
        # Add blockchain banking histogram
        visualization_figure.add_trace(
            go.Histogram(x=blockchain_failure_counts, name='Blockchain', opacity=0.7,
                        nbinsx=number_of_histogram_bins, histnorm='probability'),
            row=1, col=1
        )
        
        # Chart 2: Cumulative distribution function (ECDF)
        # Sort the failure data for cumulative plots
        traditional_failures_sorted = np.sort(traditional_failure_counts)
        blockchain_failures_sorted = np.sort(blockchain_failure_counts)
        
        # Calculate cumulative probabilities
        traditional_cumulative_probabilities = np.arange(1, len(traditional_failures_sorted)+1) / len(traditional_failures_sorted)
        blockchain_cumulative_probabilities = np.arange(1, len(blockchain_failures_sorted)+1) / len(blockchain_failures_sorted)
        
        # Add traditional ECDF line
        visualization_figure.add_trace(
            go.Scatter(x=traditional_failures_sorted, y=traditional_cumulative_probabilities, 
                      mode='lines', name='Traditional ECDF'),
            row=1, col=2
        )
        
        # Add blockchain ECDF line
        visualization_figure.add_trace(
            go.Scatter(x=blockchain_failures_sorted, y=blockchain_cumulative_probabilities, 
                      mode='lines', name='Blockchain ECDF'),
            row=1, col=2
        )
        
        # Chart 3: Box plots for comparison
        # Add traditional banking box plot
        visualization_figure.add_trace(
            go.Box(y=traditional_failure_counts, name='Traditional', boxpoints='outliers'),
            row=2, col=1
        )
        
        # Add blockchain banking box plot
        visualization_figure.add_trace(
            go.Box(y=blockchain_failure_counts, name='Blockchain', boxpoints='outliers'),
            row=2, col=1
        )
        
        # Chart 4: Bar chart comparing systemic event probabilities
        visualization_figure.add_trace(
            go.Bar(x=['Traditional', 'Blockchain'], 
                  y=[traditional_summary_stats['Probability Systemic Event']*100, 
                     blockchain_summary_stats['Probability Systemic Event']*100],
                  name='Systemic Event %'),
            row=2, col=2
        )
        
        # Update axis labels for better understanding
        visualization_figure.update_xaxes(title_text="Number of Failures", row=1, col=1)
        visualization_figure.update_yaxes(title_text="Probability", row=1, col=1)
        visualization_figure.update_xaxes(title_text="Number of Failures", row=1, col=2)
        visualization_figure.update_yaxes(title_text="Cumulative Probability", row=1, col=2)
        visualization_figure.update_yaxes(title_text="Number of Failures", row=2, col=1)
        visualization_figure.update_xaxes(title_text="System Type", row=2, col=2)
        visualization_figure.update_yaxes(title_text="Probability (%)", row=2, col=2)
        
        # Set overall figure properties
        visualization_figure.update_layout(height=800, showlegend=True, title_text="Simulation Results Comparison")
        
        # Display the interactive charts
        st.plotly_chart(visualization_figure, use_container_width=True)
        
        # Step 7: Provide download option for results
        st.subheader("💾 Download Results")
        
        # Convert results table to CSV format
        results_csv_data = detailed_comparison_table.to_csv(index=False)
        
        # Create download button
        st.download_button(
            label="📄 Download Results as CSV",
            data=results_csv_data,
            file_name=f"simulation_results_{int(time.time())}.csv",
            mime="text/csv"
        )
        
        # Show success message
        st.success("✅ Simulation completed successfully!")

# Footer section
st.markdown("---")
st.markdown(
    "<div style='text-align: center; color: #666;'>"
    "Monte Carlo Systemic Risk Model | Developed for Academic Research"
    "</div>", 
    unsafe_allow_html=True
)