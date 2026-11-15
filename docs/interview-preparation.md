# Interview preparation

## A clear explanation

Start with the problem: a team needs confidence that a change is safe to release. Trace one commit through CI, an immutable image, controlled deployment, readiness/smoke tests, observability, and rollback. Then explain boundaries: the dashboard reads operational state, while operator scripts own privileged actions.

## Questions to expect

**Why not Kubernetes?** One cost-conscious host does not justify orchestration complexity. Compose demonstrates containers and operations clearly; Kubernetes is a future option when scaling/availability requirements demand it.

**Why SQLite?** Deployment metadata has low write volume and one API owner. SQLite reduces failure modes. Multiple replicas would require an external managed database and migration plan.

**Is it production ready?** It applies production-oriented controls within a deliberately small operating model. Its current boundary is one host, no HA, local shared-token administration, and an Azure path that must be exercised before making a cloud-runtime claim. Explain that boundary and the concrete upgrade path.

**How is rollback different from restart?** Restart executes the same image again. Rollback selects the last immutable image that passed verification, deploys it, and confirms recovery.

**Why does a rolled-back deployment still fail CI?** Service recovery is good, but the requested release did not succeed. A green job would conceal a defective artifact.

**How are metrics real?** Middleware emits counters/histograms for actual HTTP traffic; Prometheus scrapes them. The UI labels unavailable data instead of seeding demo points.

## Five-minute demo

Show Service Overview, generate a controlled traffic sample, inspect the telemetry change, review the verified release record, submit a release candidate that fails readiness policy, and show the resulting rollback and correlated incident. Finish on System Topology and describe the optional Terraform/Azure path without claiming it ran.

