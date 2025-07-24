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
st.sidebar.header("Bank Simulation Parameters")

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
    options=[500, 1000, 2000, 5000, 10000],
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
results_tab, data_overview_tab = st.tabs(["📈 Results", "📊 Data Overview"])

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
        
        # Step 4: Display key results in metric cards
        st.subheader("Key Results")

        # Calculate additional metrics for crisis reduction and potential savings
        traditional_failure_counts = [result[0] for result in traditional_simulation_results]
        blockchain_failure_counts = [result[0] for result in blockchain_simulation_results]
        traditional_systemic_count = sum([result[1] for result in traditional_simulation_results])
        blockchain_systemic_count = sum([result[1] for result in blockchain_simulation_results])
        total_traditional_failures = sum(traditional_failure_counts)
        total_blockchain_failures = sum(blockchain_failure_counts)

        # Create three columns for key metrics
        metric_col1, metric_col2, metric_col3 = st.columns(3)

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

        # Calculate absolute failure counts
        traditional_failure_counts = [result[0] for result in traditional_simulation_results]
        blockchain_failure_counts = [result[0] for result in blockchain_simulation_results]
        total_traditional_failures = sum(traditional_failure_counts)
        total_blockchain_failures = sum(blockchain_failure_counts)

        # Create dataframe with detailed results including absolute failure counts
        detailed_comparison_table = pd.DataFrame({
            'Metric': ['Average Failures', 'Absolute Failure Count', 
                    'Standard Deviation', 'Systemic Event Probability (%)'],
            'Traditional': [
                f"{traditional_summary_stats['Average Failures']:.4f}",
                f"{total_traditional_failures:,}",
                f"{traditional_summary_stats['Std Dev Failures']:.4f}",
                f"{traditional_summary_stats['Probability Systemic Event']*100:.2f}%"
            ],
            'Blockchain': [
                f"{blockchain_summary_stats['Average Failures']:.4f}",
                f"{total_blockchain_failures:,}",
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

        # Chart 1: Distribution of Bank Failures (Histogram) - TOP
        st.subheader("Distribution of Bank Failures")

        # Create histogram figure
        histogram_figure = go.Figure()

        # Calculate bins for histogram
        maximum_failures_observed = int(max(max(traditional_failure_counts), max(blockchain_failure_counts)))
        number_of_histogram_bins = min(maximum_failures_observed + 1, 50)

        # Add traditional banking histogram
        histogram_figure.add_trace(
            go.Histogram(x=traditional_failure_counts, name='Traditional', opacity=0.7, 
                        nbinsx=number_of_histogram_bins, histnorm='probability')
        )

        # Add blockchain banking histogram
        histogram_figure.add_trace(
            go.Histogram(x=blockchain_failure_counts, name='Blockchain', opacity=0.7,
                        nbinsx=number_of_histogram_bins, histnorm='probability')
        )

        # Update layout for histogram
        histogram_figure.update_layout(
            xaxis_title="Number of Failures",
            yaxis_title="Probability",
            height=400,
            showlegend=True
        )

        # Display histogram
        st.plotly_chart(histogram_figure, use_container_width=True)

        # Chart 2: Systemic Event Probability (Bar Chart) - BOTTOM
        st.subheader("Systemic Event Probability")

        # Create bar chart figure
        bar_figure = go.Figure()

        # Add bar chart comparing systemic event probabilities
        bar_figure.add_trace(
            go.Bar(
                x=['Traditional', 'Blockchain'], 
                y=[traditional_summary_stats['Probability Systemic Event']*100, 
                blockchain_summary_stats['Probability Systemic Event']*100],
                name='Systemic Event %',
                marker_color=['#ef553b', '#00cc96']  # Red for traditional, green for blockchain
            )
        )

        # Update layout for bar chart
        bar_figure.update_layout(
            xaxis_title="System Type",
            yaxis_title="Probability (%)",
            height=400,
            showlegend=False
        )

        # Display bar chart
        st.plotly_chart(bar_figure, use_container_width=True)
        
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