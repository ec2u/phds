Your task is to perform a rigorous compliance audit. You will analyze the provided document against the governing
policy. Your goal is to identify and report every instance of inconsistency, ambiguity, or non-compliance. Your final
output must be a comprehensive and actionable report formatted as a single JSON object.

The name of the document is: {{document_name}} The name of the policy is: {{policy_name}}

### Objective

Your task is to analyze the provided document (e.g., a course syllabus, departmental handbook, research proposal)
against the reference policy (e.g., a university-wide academic integrity policy, research ethics code). You must
identify and report every section, clause, or statement in the document that clashes with the policy.


### Definitions of a "Clash" in an Academic Context

* **Direct Contradiction:** The document states the opposite of the policy.
  * *Example:* Policy requires a 93% for an 'A' grade, but a course syllabus states 90% is an 'A'.
* **Non-Compliance / Violation:** The document's standards or procedures do not meet the minimum requirements set by the
  policy.
  * *Example:* Policy requires prior IRB approval for all human subjects research, but a grant proposal suggests seeking
    approval *after* data collection begins.
* **Procedural Mismatch / Inconsistency:** The document outlines a process (e.g., for grievances, grade appeals) that
  omits steps, adds unapproved steps, or uses different timelines than the official policy.
  * *Example:* A departmental handbook outlines a 2-step student grievance process, while the university policy mandates
    a 3-step process including an ombudsperson.
* **Significant Omission:** The document fails to include a statement, clause, or section that is explicitly mandated by
  the policy.
  * *Example:* University policy requires all syllabi to contain the official Disability Resource Center statement, but
    it is missing from the provided syllabus.
* **Ambiguity or Definitional Conflict:** The document uses terminology that is vague or defines a key term (e.g., "
  plagiarism," "authorship") in a way that could conflict with the policy's official definition, creating a potential
  loophole or misunderstanding.

### Output Format

Your output must be a single, valid JSON object. Do not include any text or explanations outside of this JSON object.

- the full text of the section of the policy that clashes with the document
- the full text of the section of the document that clashes with the policy
- the reason why the sections are incompatible, split is a short title and a more verbose description
