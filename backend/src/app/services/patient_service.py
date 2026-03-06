from bson import ObjectId
from ..core.database import Database

class PatientService:
    def __init__(self):
        self.db = Database()

    def get_all_patients(self, limit=20):
        # Return lightweight list for dropdowns
        patients = list(self.db.db.patients.find(
            {}, 
            {"display_id": 1, "demographics": 1, "conditions": 1}
        ).limit(limit))
        
        # Convert ObjectId to string
        for p in patients:
            p['_id'] = str(p['_id'])
        return patients

    def get_patient_by_id(self, patient_id: str):
        try:
            return self.db.db.patients.find_one({"_id": ObjectId(patient_id)})
        except:
            return None