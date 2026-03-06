from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine

text = "My name is John Doe and my phone number is 9876543210 and email is john@gmail.com"

# Detect PII
analyzer = AnalyzerEngine()
results = analyzer.analyze(text=text, language="en")

print("Detected entities:")
for r in results:
    print(r)

# Anonymize PII
anonymizer = AnonymizerEngine()
anonymized_text = anonymizer.anonymize(
    text=text,
    analyzer_results=results
)

print("\nAnonymized text:")
print(anonymized_text.text)
