"""
Main script for the Monte Carlo Systemic Risk Model
"""

import time
import os
import datetime
import pandas as pd
import config
import data_loader
import exposure_matrix
import simulation
import analysis
import visualization

def main():
    """
    Main function to run the Monte Carlo Systemic Risk Model
    """
    # Start timing the execution
    start_time = time.time()
    
    # Create output directory with timestamp
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = f"results_{timestamp}"
    os.makedirs(output_dir, exist_ok=True)
    print(f"Created output directory: {output_dir}")
    
    # Set output file paths
    output_paths = {
        'calc_trad_exposure': os.path.join(output_dir, config.CALC_TRAD_EXPOSURE_FILE),
        'calc_bc_exposure': os.path.join(output_dir, config.CALC_BC_EXPOSURE_FILE),
        'results': os.path.join(output_dir, config.RESULTS_FILE),
        'failure_dist': os.path.join(output_dir, config.FAILURE_DIST_IMG),
        'failure_corr': os.path.join(output_dir, config.FAILURE_CORR_IMG)
    }
    
    print("Monte Carlo Systemic Risk Model: Traditional vs Blockchain Banking Systems")
    print("======================================================================")
    print("Author: Naznin Anwar Vadakkathinakath")
    print("Institution: Coburg University of Applied Sciences and Arts")
    print("\nInitializing model...")
    
    # Load bank data
    data = data_loader.load_bank_data()
    
    # Print model parameters
    print(f"\nModel Parameters:")
    print(f"- Number of banks: {len(data)}")
    print(f"- Initial shock probability: {config.SHOCK_PROB*100}%")
    print(f"- Number of simulations: {config.N_SIM}")
    print(f"- Systemic event threshold: {config.SYSTEMIC_THRESHOLD}+ bank failures")
    print(f"- Traditional LGD: {config.TRAD_LGD*100}%")
    print(f"- Blockchain LGD: {config.BC_LGD*100}%")
    print(f"- Blockchain interbank liability reduction: {config.BC_LIABILITY_REDUCTION*100}%")
    
    # Get exposure matrices
    print("\nLoading/building exposure matrices...")
    trad_exposure = exposure_matrix.get_traditional_exposure_matrix(data, output_paths['calc_trad_exposure'])
    bc_exposure = exposure_matrix.get_blockchain_exposure_matrix(data, trad_exposure, output_paths['calc_bc_exposure'])
    
    # Run simulations
    print("\nRunning Traditional Banking System simulation...")
    trad_results = simulation.monte_carlo_sim(
        data, 
        trad_exposure, 
        lgd=config.TRAD_LGD, 
        shock_prob=config.SHOCK_PROB, 
        n_sim=config.N_SIM,
        model_type="Traditional"
    )
    
    print("\nRunning Blockchain Banking System simulation...")
    bc_results = simulation.monte_carlo_sim(
        data, 
        bc_exposure, 
        lgd=config.BC_LGD, 
        shock_prob=config.SHOCK_PROB, 
        n_sim=config.N_SIM,
        model_type="Blockchain"
    )
    
    # Analyze results
    trad_summary = analysis.summarize_results(trad_results)
    bc_summary = analysis.summarize_results(bc_results)
    improvements = analysis.calculate_improvements(trad_summary, bc_summary)
    results_df = analysis.create_results_table(trad_summary, bc_summary, improvements)
    
    # Print results
    print("\n======================================================================")
    print("SIMULATION RESULTS")
    print("======================================================================")
    print(results_df.to_string(index=False))
    
    # Statistical analysis
    t_stat, p_value, cohens_d, effect = analysis.perform_statistical_analysis(trad_results, bc_results)
    
    print("\n======================================================================")
    print("STATISTICAL ANALYSIS")
    print("======================================================================")
    print(f"T-statistic: {t_stat:.4f}")
    print(f"P-value: {p_value:.4f}")
    print(f"Statistically significant difference: {p_value < 0.05}")
    print(f"Effect size (Cohen's d): {cohens_d:.4f}")
    print(f"Effect interpretation: {effect}")
    
    # Create visualizations
    print("\nGenerating visualizations...")
    visualization.setup_visualization()
    visualization.create_failure_distribution_plot(trad_results, bc_results, trad_summary, bc_summary, output_paths['failure_dist'])
    visualization.create_correlation_heatmaps(trad_results, bc_results, data, output_paths['failure_corr'])
    
    # Save results to CSV
    results_df.to_csv(output_paths['results'], index=False)
    
    # Calculate execution time
    end_time = time.time()
    execution_time = end_time - start_time
    
    print(f"\nResults saved to '{output_paths['results']}'")
    print(f"Visualizations saved as '{output_paths['failure_dist']}' and '{output_paths['failure_corr']}'")
    print(f"\nExecution time: {execution_time:.2f} seconds")
    print("\nMonte Carlo Systemic Risk Model execution complete.")

if __name__ == "__main__":
    main()