import asyncio
import logging

from langfuse import observe

from config.paths import get_input_dir
from inconsistency.core.inconsistency_detection_service import InconsistencyDetectionService
from llm.ports.gemini_port import GeminiPort
from prompt.ports.langfuse_port import LangfusePort


@observe(name="Detect Inconsistencies")
async def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

    input_dir = get_input_dir()

    logging.info("Instantiating clients...")
    gemini_port = GeminiPort(model_name="gemini-2.5-pro")
    langfuse_port = LangfusePort()
    inconsistency_detection_service = InconsistencyDetectionService(gemini_port, langfuse_port)

    logging.info("Beginning file processing...")
    agreement_path = input_dir / "Agreement EN - 250204 Cotutelle Agreement UJ-UTU.pdf"
    policy_path = (
        input_dir / "Area Policy Jena DE - Attachment II Provisions for Doctoral Candidates of the Faculty UJ.pdf"
    )

    logging.info("Detecting inconsistencies...")
    known_issues = """
    Inconsistency (1): Contradictory Thesis Publication Timeline (High)
The agreement requires the thesis to be published before the oral defense, while the university policy mandates publication only after the successful completion of the entire examination procedure. This reverses the required sequence of the final doctoral steps.
Document content: The doctoral thesis will be published at the latest 10 days before the oral defence.
Policy content: After acceptance of the dissertation and successful completion of the oral examination, the doctoral candidate is obliged to publish the dissertation... The required deposit copies must be submitted within one year of the completion of the doctoral procedure.

Inconsistency (2): Improper Doctoral Committee Composition (Majority Rule) (High)
The agreement stipulates a 'balanced proportion' where each partner university nominates half of the committee members. This directly contradicts the policy, which mandates that a majority of the committee members must belong to the UJ Faculty of Chemistry and Geosciences.
Document content: The doctoral committee, appointed by the two partner institutions, is composed on the basis of a balanced proportion of members proposed by each institution. ... Each university nominates half of the committee.
Policy content: At least one reviewer and the majority of the members of the doctoral committee should belong to the Faculty of Chemistry and Geosciences.

Inconsistency (3): Conflicting Committee Appointment Authority (Medium)
The agreement outlines a collaborative appointment process where the committee is formed by mutual agreement between the partner institutions. This conflicts with the policy, which vests the sole authority for appointing the entire doctoral committee in the UJ Faculty Council.
Document content: The competent authority of the partner universities is responsible for the appointment of the reviewers and additional members of the doctoral committee. ... The committee members, the chairperson and the opponent will be appointed by agreement between the partner institutions.
Policy content: To carry out the doctoral procedure, the Faculty Council appoints a doctoral committee including, as a rule, two reviewers. ... The chairperson should be a member of the group of professors of the faculty.

Inconsistency (4): Omission of Mandatory Faculty Inspection Period (Medium)
The agreement's procedure for approving the public defense omits the mandatory two-week inspection period ('Auslagefrist') required by the UJ policy, which allows all qualified faculty members to review the dissertation before the defense is approved.
Document content: On the basis of the statements from the pre-examiners, if the level is found to be acceptable, the Faculty of Science, UTU grants the permission for the public defence of the dissertation.
Policy content: After receipt of the reviews, the dissertation is available for inspection and, if applicable, comment by the university professors and habilitated members of the faculty at the Dean's office for two weeks.

Inconsistency (5): Omission of Dissertation Grade Calculation Method (Low)
The agreement vaguely states that the dissertation grade is 'based on the reviews,' omitting the specific calculation method prescribed by the policy, which requires the grade to be calculated as the average of the reviewers' individual grades and includes a procedure for resolving discrepancies.
Document content: The overall grade for UJ will be determined by the committee based on the reviews on the thesis and the predicate of the oral examination.
Policy content: If all reviewers recommend acceptance of the dissertation, the doctoral committee decides on the overall grade of the dissertation. It is calculated from the average of the grades of the reviewers. ... If the difference between the reviewers' grades is 1.0 or more, the Dean, in consultation with the Faculty Council, requests another review.

Inconsistency (6): Reduction in Minimum Doctoral Committee Size (Medium)
The agreement reduces the minimum size of the doctoral committee to 'at least four members'. This is smaller than the committee size implied by the policy, which generally consists of two reviewers, at least two other academic members, and a chairperson, for a total of at least five members.
Document content: Composition of the doctoral committee: The committee is made up of at least four members and up to six members, including the two supervisors (who shall not vote).
Policy content: The doctoral committee generally consists of the reviewers, at least two other members who are university professors, private lecturers or heads of junior research groups, and a chairperson.

Inconsistency (7): Omission of Mandatory Numerical Grading Scale (Medium)
The agreement omits the specific numerical values for dissertation grades that are mandated by the policy. The agreement only lists the Latin terms, while the policy provides a detailed numerical scale necessary for precise grade calculation.
Document content: The thesis, the oral examination and the overall grade of the doctoral degree will be rated by the UJ along the following scale: “summa cum laude” (with distinction) “magna cum laude” (excellent) “cum laude” (good) “rite” (satisfactory)
Policy content: They [the reviewers] assess the academic performance... and award the following grades: summa cum laude (excellent work) 1.0, magna cum laude (very good work) 1.3, cum laude (good work) 1.7 or 2.0 or 2.3, rite (sufficient work) 2.7 or 3.0 or 3.3.

Inconsistency (8): Contradictory Rules for Reviewer Affiliation (High)
The agreement mandates that all dissertation reviewers must be external to both partner universities. This directly contradicts the policy, which requires that at least one reviewer must be an internal member of the UJ Faculty of Chemistry and Geosciences.
Document content: Examiners must come from outside UTU and UJ and the examiners should represent different organisations.
Policy content: At least one reviewer and the majority of the members of the doctoral committee should belong to the Faculty of Chemistry and Geosciences.

Inconsistency (9): Restriction of Oral Examination Language (Low)
The agreement restricts the language of the oral examination to English only. This removes a right granted by the university policy, which explicitly allows the examination to be conducted in either German or English.
Document content: The language of the oral examination is English.
Policy content: It [the oral examination] is held in German or English.

Inconsistency (10): Omission of Mandatory Procedure for 'Summa Cum Laude' Grade (High)
The agreement omits a mandatory procedure required by the policy for awarding the 'summa cum laude' grade. The policy requires that if the first two reviewers propose this grade, a third, external reviewer must be appointed, a quality assurance step missing from the agreement.
Document content: Section 2.6: "Summa cum laude is only assigned if all reviews assign this grade and if the oral examination also received this grade."
Policy content: § 8 (9): "If the grade 'summa cum laude' is proposed twice, the dean immediately appoints an additional, external reviewer."

Inconsistency (11): Reduced Timeline for Dissertation Review (Medium)
The agreement shortens the allowed time for dissertation review to one month. This conflicts with the policy, which allows reviewers a period of up to two months to submit their reports.
Document content: Section 2.2: "The pre-examiners have one month to write a statement about the dissertation manuscript."
Policy content: § 8 (9): "The reports (Gutachten) should be submitted to the dean no later than two months after the opening of the doctoral procedure."
    """
    res = await inconsistency_detection_service.detect_inconsistencies(
        agreement_path, policy_path, known_issues=known_issues
    )
    logging.info(f"Found {len(res)} inconsistencies")
    for i, inconsistency in enumerate(res):
        logging.info(
            f"Inconsistency ({i + 1}): {inconsistency.inconsistency_title} ({inconsistency.severity.value})\n{inconsistency.inconsistency_description}\nDocument content: {inconsistency.agreement_content}\nPolicy content: {inconsistency.policy_content}\n\n\n"
        )


if __name__ == "__main__":
    asyncio.run(main())
