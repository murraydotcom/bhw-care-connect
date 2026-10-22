# BHW0000 outstanding Blueprint work

The patient dashboard can display Health Core's optional exact-version `blueprintTasks` projection as generic care-team follow-up, status and due time. It uses explicit fields, text rendering and no staff owners, result values, interpretations or copied clinical action wording. Completed/superseded work is absent from the outstanding list; missing clinical planning appears as planning pending.

This is a read-only view. Health Core owns the signed/released Blueprint and provider decisions; CrewOS owns the referenced operational task/reminder state. The view creates no patient messages, check-ins, orders, prescriptions or claims. It is hidden when the backend projection flag is off. No new patient selector or browser service secret exists.

Depends on Care Connect #30/#212 and its messaging #29 base, the Health Core #149 authority/actions extension and the CrewOS persistent-task extension. Enable only after both protected synthetic source services are verified. See the [full contract and acceptance limits](https://github.com/murraydotcom/bhw-health-core/blob/codex/blueprint-authority-20261021/docs/BHW0000_BLUEPRINT_AUTHORITY_AND_TASKS.md). Local build/tests do not establish protected browser acceptance, deployment, actual patient authorization or human clinical approval.
