---
title: INCONSISTENCY_MERGING Version History
summary: Issues addressed in each iteration of the inconsistency merging prompt
description: |
  Deduplication prompt that consolidates raw inconsistency reports into a clean list of unique findings. Operates
  downstream of INCONSISTENCY_DETECTION, grouping differently worded reports of the same conflict into single canonical
  descriptions.
---

# Version History

| Transition     | Changes                                                                                                                                                                                                                                                                                                              | Likely Issue Addressed                                                                                                                                                                                                        |
|----------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 001 (baseline) | Role as "Expert Analyst in Academic Policy and Compliance"; deduplication criteria with three worked examples; inline `{{inconsistencies}}` template variable; JSON output                                                                                                                                           | Initial merging prompt for consolidating raw inconsistency reports                                                                                                                                                            |
| 001 to 002     | Replaced inline `{{inconsistencies}}` template variable with structured input description (each entry contains: issue title, issue severity, issue analysis, reference agreement excerpt, reference policy excerpt); moved INPUT DATA section before OBJECTIVE; removed variable from YAML; minor punctuation change | Upstream pipeline evolved to produce structured issue reports instead of flat text; migration from template interpolation to programmatic message construction; section reordering for better "context first, then task" flow |
