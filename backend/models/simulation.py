"""
Simulation models
"""

import uuid
from datetime import datetime
import json
from backend.app import db

class Simulation(db.Model):
    """Simulation model for storing simulation parameters and status"""
    
    __tablename__ = 'simulations'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    status = db.Column(db.String(20), nullable=False)  # pending, running, completed, failed
    progress = db.Column(db.Float, nullable=False, default=0.0)
    status_message = db.Column(db.String(255), nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    _parameters = db.Column('parameters', db.Text, nullable=False)
    
    # Relationships
    result = db.relationship('SimulationResult', backref='simulation', lazy=True, uselist=False)
    
    @property
    def parameters(self):
        """Get parameters as dictionary"""
        return json.loads(self._parameters)
    
    @parameters.setter
    def parameters(self, value):
        """Set parameters from dictionary"""
        self._parameters = json.dumps(value)
    
    def to_dict(self):
        """Convert simulation to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'status': self.status,
            'progress': self.progress,
            'status_message': self.status_message,
            'error_message': self.error_message,
            'parameters': self.parameters,
            'has_result': self.result is not None
        }
    
    def __repr__(self):
        return f'<Simulation {self.name}>'


class SimulationResult(db.Model):
    """SimulationResult model for storing simulation results"""
    
    __tablename__ = 'simulation_results'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    simulation_id = db.Column(db.String(36), db.ForeignKey('simulations.id'), nullable=False)
    completed_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    _traditional_summary = db.Column('traditional_summary', db.Text, nullable=False)
    _blockchain_summary = db.Column('blockchain_summary', db.Text, nullable=False)
    _improvements = db.Column('improvements', db.Text, nullable=False)
    _statistical_analysis = db.Column('statistical_analysis', db.Text, nullable=False)
    _raw_data = db.Column('raw_data', db.Text, nullable=True)  # Optional for large datasets
    
    @property
    def traditional_summary(self):
        """Get traditional summary as dictionary"""
        return json.loads(self._traditional_summary)
    
    @traditional_summary.setter
    def traditional_summary(self, value):
        """Set traditional summary from dictionary"""
        self._traditional_summary = json.dumps(value)
    
    @property
    def blockchain_summary(self):
        """Get blockchain summary as dictionary"""
        return json.loads(self._blockchain_summary)
    
    @blockchain_summary.setter
    def blockchain_summary(self, value):
        """Set blockchain summary from dictionary"""
        self._blockchain_summary = json.dumps(value)
    
    @property
    def improvements(self):
        """Get improvements as dictionary"""
        return json.loads(self._improvements)
    
    @improvements.setter
    def improvements(self, value):
        """Set improvements from dictionary"""
        self._improvements = json.dumps(value)
    
    @property
    def statistical_analysis(self):
        """Get statistical analysis as dictionary"""
        return json.loads(self._statistical_analysis)
    
    @statistical_analysis.setter
    def statistical_analysis(self, value):
        """Set statistical analysis from dictionary"""
        self._statistical_analysis = json.dumps(value)
    
    @property
    def raw_data(self):
        """Get raw data as dictionary"""
        return json.loads(self._raw_data) if self._raw_data else None
    
    @raw_data.setter
    def raw_data(self, value):
        """Set raw data from dictionary"""
        self._raw_data = json.dumps(value) if value else None
    
    def to_dict(self, include_raw_data=False):
        """
        Convert simulation result to dictionary
        
        Args:
            include_raw_data (bool): Whether to include raw data in the response
        """
        result = {
            'id': self.id,
            'simulation_id': self.simulation_id,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'traditional_summary': self.traditional_summary,
            'blockchain_summary': self.blockchain_summary,
            'improvements': self.improvements,
            'statistical_analysis': self.statistical_analysis,
            'has_raw_data': self._raw_data is not None
        }
        
        if include_raw_data and self._raw_data:
            result['raw_data'] = self.raw_data
        
        return result
    
    def __repr__(self):
        return f'<SimulationResult {self.id}>'