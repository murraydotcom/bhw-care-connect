const system = (definition) => Object.freeze(definition);
const program = (definition) => Object.freeze(definition);

export const CORE_SYSTEM_IDS = Object.freeze([
  "cardiovascular",
  "respiratory",
  "digestive",
  "neurological",
  "endocrine",
  "immune-lymphatic",
  "musculoskeletal",
]);

export const SYSTEMS = Object.freeze([
  system({
    id: "cardiovascular",
    href: "/bhw-cardio.html",
    name: "Cardiovascular system",
    shortName: "Heart & circulation",
    eyebrow: "Cardiovascular",
    asset: "system-cardiovascular-cutout-v1.png",
    aliases: ["cardiovascular", "cardio", "heart", "heart and circulation", "heart & circulation", "blood vessels circulation", "blood-vessels-circulation", "circulation"],
    overview: "Your cardiovascular system is a continuous transport network: the heart generates pressure, the lungs exchange gases with the blood, large vessels distribute flow, and microscopic vessels deliver oxygen and nutrients to individual tissues.",
    anatomy: [
      ["Heart chambers and valves", "The right atrium and ventricle move oxygen-poor blood to the lungs. The left atrium and thick-walled left ventricle return oxygen-rich blood to the body. The tricuspid, pulmonary, mitral, and aortic valves keep flow moving in one direction."],
      ["Electrical and pumping system", "The sinoatrial node starts each heartbeat, the atrioventricular node delays the signal, and the His–Purkinje network coordinates ventricular contraction. Heart muscle, valves, electrical timing, filling, and ejection all contribute to effective cardiac output."],
      ["Coronary circulation", "The right and left coronary arteries branch across and through the heart muscle. Arterioles and dense myocardial capillary beds match oxygen delivery to the heart’s changing workload; cardiac veins return blood through the coronary sinus."],
      ["Great vessels and pulmonary circuit", "The venae cavae return systemic blood, the pulmonary arteries carry it to the lungs, pulmonary veins return oxygenated blood, and the aorta distributes it through its arch, thoracic, and abdominal branches."],
      ["Systemic arteries and veins", "Elastic arteries smooth each pressure wave, muscular arteries direct regional flow, and veins act as a volume reservoir with valves that support return from the limbs."],
      ["Microcirculation and endothelium", "Arterioles regulate resistance before blood enters capillary networks. Capillary walls support exchange; venules collect blood afterward. The endothelial lining also participates in vascular tone, clotting balance, inflammation, and barrier function."],
      ["Cerebral microvasculature", "Carotid and vertebral pathways feed the circle of Willis and surface arteries. Penetrating arterioles descend into the brain, where extremely dense capillary networks and the blood–brain barrier support neurons with tightly controlled flow."],
    ],
    pathways: [
      ["Pulmonary loop", "Right ventricle → pulmonary arteries → lung capillaries → pulmonary veins → left atrium."],
      ["Systemic loop", "Left ventricle → aorta → regional arteries → arterioles → capillaries → veins → venae cavae → right atrium."],
      ["Myocardial delivery", "Aortic root → coronary arteries → intramyocardial arterioles and capillaries → cardiac veins → coronary sinus."],
      ["Brain delivery", "Carotid and vertebral arteries → circle of Willis → cerebral and penetrating arteries → brain capillary beds → cerebral veins and dural sinuses."],
    ],
    connections: ["Respiratory gas exchange loads oxygen and removes carbon dioxide.", "Kidney, endocrine, and autonomic signals adjust blood volume, pressure, heart rate, and vascular tone.", "Muscle activity improves venous return and changes regional blood-flow demand.", "Immune and metabolic signaling can affect the endothelium and microvascular exchange."],
  }),
  system({
    id: "respiratory",
    href: "/bhw-respiratory.html",
    name: "Respiratory system",
    shortName: "Lungs & breathing",
    eyebrow: "Respiratory",
    asset: "system-respiratory-v1.png",
    aliases: ["respiratory", "respiration", "lungs", "lung", "airway", "lungs and breathing", "lungs & breathing"],
    overview: "The respiratory system moves air from the upper airway to millions of alveoli, where a thin air–blood membrane and pulmonary capillary network exchange oxygen and carbon dioxide with every breath.",
    anatomy: [
      ["Upper airway", "The nose, nasal cavity, sinuses, mouth, pharynx, and larynx warm, humidify, filter, and direct air while protecting the lower airway during swallowing."],
      ["Tracheobronchial tree", "The trachea divides at the carina into main bronchi, then lobar and segmental bronchi, bronchioles, terminal bronchioles, and respiratory bronchioles. Smooth muscle and mucus-producing tissue help regulate and protect these passages."],
      ["Lung lobes and pleura", "The right lung has three lobes and the left has two, leaving space for the heart. Visceral and parietal pleura create a low-friction, pressure-coupled envelope around each lung."],
      ["Acini and alveoli", "Respiratory bronchioles lead to alveolar ducts and clusters of alveoli. Type I cells form the exchange surface; type II cells produce surfactant that helps keep alveoli open; macrophages remove inhaled debris."],
      ["Pulmonary microcirculation", "Pulmonary arteries follow the airways into dense capillary sheets wrapped around alveoli. This short, low-pressure circuit maximizes contact between blood and ventilated air."],
      ["Breathing muscles", "The diaphragm is the primary inspiratory muscle. Intercostal and accessory muscles expand or stabilize the rib cage, while elastic recoil supports quiet exhalation."],
      ["Neural control and defense", "Brainstem respiratory centers, chemoreceptors, cough reflexes, cilia, mucus, and local immune tissue coordinate breathing drive and airway defense."],
    ],
    pathways: [
      ["Airflow", "Nose or mouth → pharynx → larynx → trachea → bronchi → bronchioles → alveoli."],
      ["Gas exchange", "Oxygen crosses the alveolar–capillary membrane into red blood cells; carbon dioxide moves in the opposite direction for exhalation."],
      ["Ventilation–perfusion matching", "Local airway and vascular responses help align fresh air with pulmonary blood flow across different lung regions."],
    ],
    connections: ["The cardiovascular system carries respiratory gases between lungs and tissues.", "The nervous system sets breathing rhythm and responds to oxygen, carbon dioxide, and pH.", "Immune tissue and mucociliary clearance defend the airway.", "Musculoskeletal mechanics determine chest-wall movement and breathing effort."],
  }),
  system({
    id: "digestive",
    href: "/bhw-gi.html",
    name: "Digestive system",
    shortName: "Digestion & absorption",
    eyebrow: "Digestive",
    asset: "system-digestive-v1.png",
    aliases: ["digestive", "digestion", "gi", "gastrointestinal", "gut", "digestion and absorption", "digestion & absorption"],
    overview: "The digestive system is a continuous muscular and biochemical pathway that breaks food into absorbable components, manages water and electrolytes, supports the microbiome, and routes absorbed nutrients through the liver before wider circulation.",
    anatomy: [
      ["Mouth, salivary glands, and swallowing", "Teeth and tongue mechanically prepare food while salivary glands begin lubrication and chemical digestion. The pharynx and upper esophageal sphincter coordinate safe swallowing."],
      ["Esophagus and stomach", "Peristaltic contractions move material through the esophagus. The stomach stores and mixes it while acid, enzymes, mucus, and coordinated emptying prepare contents for the small intestine."],
      ["Liver and portal circulation", "The liver receives nutrient-rich blood through the portal vein and arterial blood through the hepatic artery. Hepatocytes process nutrients, make bile and plasma proteins, and transform many medications and metabolic by-products."],
      ["Gallbladder and bile ducts", "The gallbladder stores and concentrates bile. In response to a meal, bile moves through the cystic and common bile ducts into the duodenum to support fat digestion and absorption."],
      ["Pancreas and pancreatic duct", "Exocrine pancreatic cells release digestive enzymes and bicarbonate into the duodenum. Endocrine islet cells also link digestion to glucose regulation."],
      ["Small intestine", "The duodenum coordinates incoming acid, bile, and pancreatic secretions. The jejunum and ileum use folds, villi, and microvilli to create an extensive absorptive surface for nutrients."],
      ["Large intestine and anorectal pathway", "The cecum, appendix, colon, rectum, and anal canal recover water and electrolytes, house a dense microbial community, compact stool, and coordinate elimination."],
      ["Enteric nervous and immune systems", "Nerve plexuses within the gut wall coordinate movement and secretion. Gut-associated lymphoid tissue, the epithelial barrier, and resident microbes communicate with systemic immune and nervous pathways."],
    ],
    pathways: [
      ["Luminal route", "Mouth → esophagus → stomach → duodenum → jejunum → ileum → colon → rectum."],
      ["Digestive secretions", "Saliva, gastric juice, bile, pancreatic enzymes, bicarbonate, and intestinal enzymes act at different points in the pathway."],
      ["Nutrient delivery", "Most water-soluble nutrients enter portal blood and pass through the liver; many absorbed fats first travel through intestinal lymphatic vessels."],
    ],
    connections: ["The endocrine pancreas and gut hormones coordinate appetite, digestion, and glucose handling.", "The liver links digestion with metabolism, detoxification, clotting proteins, and cholesterol pathways.", "The enteric and autonomic nervous systems connect gut function with stress and brain signaling.", "Gut barrier, microbiome, and lymphoid tissue interact with immune regulation."],
  }),
  system({
    id: "neurological",
    href: "/bhw-neuro.html",
    name: "Neurological system",
    shortName: "Brain, spine & nerves",
    eyebrow: "Neurological",
    asset: "system-neurological-v1.png",
    aliases: ["neurological", "neurology", "neuro", "nervous system", "brain", "mind and mood", "mind & mood", "brain spine and nerves", "brain spine & nerves"],
    overview: "The neurological system integrates sensation, movement, cognition, emotion, sleep, and automatic organ control through the brain, spinal cord, cranial nerves, peripheral nerves, and autonomic networks.",
    anatomy: [
      ["Cerebral hemispheres", "Frontal, parietal, temporal, and occipital regions participate in executive function, sensation, language, memory, emotion, movement planning, and vision through distributed cortical networks."],
      ["Deep brain structures", "The thalamus relays information, basal ganglia help select movement and behavior, hippocampal structures support memory, and limbic circuits participate in motivation and emotional processing."],
      ["Brainstem and cerebellum", "The midbrain, pons, and medulla carry major pathways and regulate vital automatic functions. The cerebellum refines timing, balance, coordination, and motor learning."],
      ["Spinal cord", "Ascending tracts carry sensory information; descending tracts carry motor commands. Segmental circuits also coordinate reflexes and provide origins for spinal nerves."],
      ["Cranial nerves", "Twelve paired cranial nerves connect the brain with sensory organs and muscles of the head and neck; several also contribute to swallowing, voice, balance, eye movement, and parasympathetic organ control."],
      ["Peripheral nerves and plexuses", "Cervical, brachial, lumbar, and sacral plexuses organize motor and sensory fibers before they travel through named nerves into the trunk and limbs."],
      ["Autonomic nervous system", "Sympathetic chains and parasympathetic pathways adjust heart rate, vessel tone, breathing, digestion, bladder function, pupil size, sweating, and other involuntary responses."],
      ["Neurovascular unit", "Neurons, glial cells, endothelial cells, pericytes, and cerebral capillaries work together to match local blood flow to activity while maintaining the blood–brain barrier."],
    ],
    pathways: [
      ["Sensation", "Peripheral receptors → sensory nerves → spinal cord or brainstem → thalamic and cortical networks."],
      ["Movement", "Motor cortex and brainstem systems → descending tracts → spinal motor neurons → peripheral nerves → muscle."],
      ["Autonomic regulation", "Hypothalamic and brainstem centers → sympathetic or parasympathetic pathways → heart, vessels, lungs, digestive organs, and glands."],
    ],
    connections: ["Cerebral microvessels supply high metabolic demand and protect the brain environment.", "Endocrine signals influence sleep, stress, appetite, reproductive function, and metabolism.", "Muscles and joints continuously send position and movement information back to the brain.", "Immune signaling and the gut–brain axis can influence neural function and symptoms."],
  }),
  system({
    id: "endocrine",
    href: "/bhw-endocrine.html",
    name: "Endocrine system",
    shortName: "Hormones & metabolism",
    eyebrow: "Endocrine",
    asset: "system-endocrine-v1.png",
    aliases: ["endocrine", "hormones", "metabolic", "metabolism", "energy metabolism", "energy-metabolism", "energy and metabolism", "energy & metabolism", "hormones and metabolism", "hormones & metabolism"],
    overview: "The endocrine system coordinates longer-range chemical signals. Interconnected glands and hormone-producing tissues regulate energy use, glucose, stress response, growth, fluid balance, bone turnover, temperature, sleep, and reproductive physiology.",
    anatomy: [
      ["Hypothalamus and pituitary", "The hypothalamus integrates neural, circadian, nutritional, and stress signals. The pituitary releases hormones that direct the thyroid, adrenal cortex, growth pathways, lactation, and reproductive endocrine function while also regulating water balance."],
      ["Pineal gland", "The pineal gland produces melatonin in response to light–dark signaling and contributes to circadian timing."],
      ["Thyroid and parathyroid glands", "Thyroid hormones influence metabolic rate, temperature, heart function, and development. Parathyroid hormone helps regulate calcium and phosphate with the kidneys, intestine, and bone."],
      ["Adrenal glands", "The cortex produces cortisol, aldosterone, and adrenal androgens. The medulla releases epinephrine and norepinephrine as part of rapid stress responses."],
      ["Pancreatic islets", "Beta, alpha, delta, and other islet cells coordinate insulin, glucagon, somatostatin, and related signals to regulate circulating nutrients between meals and after eating."],
      ["Thymic and peripheral endocrine signals", "The thymus is most active earlier in life and also releases signaling peptides. The kidneys, heart, liver, digestive tract, fat, bone, and skin produce hormones or hormone-like signals that participate in system-wide regulation."],
      ["Reproductive endocrine axis", "Hypothalamic and pituitary signals coordinate with gonadal hormones. This axis influences reproductive function as well as bone, muscle, vascular, mood, and metabolic health; detailed anatomy should be reviewed with a clinician when relevant."],
    ],
    pathways: [
      ["Thyroid axis", "Hypothalamus → pituitary → thyroid → target tissues, with feedback to the brain and pituitary."],
      ["Stress axis", "Hypothalamus → pituitary → adrenal cortex → cortisol-responsive tissues, with circadian rhythm and feedback control."],
      ["Glucose regulation", "Digestive absorption and liver output are balanced by insulin, glucagon, incretin signals, muscle uptake, and adipose storage or release."],
    ],
    connections: ["Hormones alter cardiovascular rate, pressure, volume, and vascular tone.", "Neural and circadian inputs regulate endocrine timing.", "Bone, muscle, liver, fat, kidney, and gut act as both targets and signaling organs.", "Immune cytokines and endocrine stress signals influence one another."],
  }),
  system({
    id: "immune-lymphatic",
    href: "/bhw-immune.html",
    name: "Immune & lymphatic system",
    shortName: "Immune & lymphatic",
    eyebrow: "Immune / lymphatic",
    asset: "system-immune-lymphatic-v1.png",
    aliases: ["immune", "immunity", "lymphatic", "immune lymphatic", "immune-lymphatic", "immune and lymphatic", "immune & lymphatic", "inflammation immune"],
    overview: "The immune and lymphatic systems form a distributed defense, surveillance, drainage, and transport network. Barriers, immune cells, lymph vessels, lymph nodes, spleen, thymus, marrow, and mucosal tissues work together rather than as a single organ.",
    anatomy: [
      ["Bone marrow", "Marrow produces blood and immune-cell precursors. B cells mature there, while T-cell precursors travel to the thymus."],
      ["Thymus", "The thymus supports T-cell maturation and selection, especially earlier in life, helping create cells that can respond to threats while limiting harmful self-reactivity."],
      ["Lymphatic capillaries and vessels", "Blind-ended lymphatic capillaries collect excess tissue fluid, proteins, immune cells, and absorbed intestinal fats. Larger vessels use valves and surrounding muscle movement to return lymph toward the bloodstream."],
      ["Lymph nodes", "Clusters in cervical, axillary, mediastinal, abdominal, pelvic, and inguinal regions filter lymph and organize encounters among antigen-presenting cells, B cells, and T cells."],
      ["Spleen", "The spleen filters blood rather than lymph, removes aging blood cells, stores some platelets, and mounts immune responses to blood-borne material."],
      ["Mucosal immune tissue", "Tonsils, adenoids, Peyer patches, appendix, and other mucosa-associated lymphoid tissues monitor surfaces where the body meets inhaled or swallowed material."],
      ["Innate and adaptive defense", "Barrier cells, complement, phagocytes, natural killer cells, B cells, T cells, and antibodies provide layered rapid and learned responses."],
      ["Major lymphatic ducts", "The thoracic duct drains most of the body, while the right lymphatic duct drains the right upper quadrant. Both return lymph to venous circulation near the base of the neck."],
    ],
    pathways: [
      ["Tissue-fluid return", "Blood capillaries → interstitial space → lymphatic capillaries → collecting vessels → nodes → lymphatic ducts → venous circulation."],
      ["Immune activation", "Barrier or tissue signal → innate recognition and antigen capture → lymph node or spleen → targeted cellular and antibody response."],
      ["Intestinal fat transport", "Intestinal lacteals collect chylomicrons → mesenteric lymphatics → thoracic duct → bloodstream."],
    ],
    connections: ["Cardiovascular capillaries create the fluid that lymphatics return.", "Respiratory and digestive mucosa provide major immune surveillance surfaces.", "Bone marrow and endocrine stress signals shape immune-cell production and activity.", "Skeletal-muscle movement helps propel lymph through valved vessels."],
  }),
  system({
    id: "musculoskeletal",
    href: "/bhw-msk.html",
    name: "Musculoskeletal system",
    shortName: "Bones, joints & muscle",
    eyebrow: "Musculoskeletal",
    asset: "system-musculoskeletal-v1.png",
    views: [
      {
        id: "posterior",
        label: "Posterior spine view",
        asset: "system-musculoskeletal-posterior-v1.png",
        alt: "Detailed posterior musculoskeletal view of a brown-skinned adult emphasizing the complete spine, sacrum, posterior bones, muscles, and tendons",
      },
      {
        id: "anterior",
        label: "Front view",
        asset: "system-musculoskeletal-v1.png",
        alt: "Detailed anterior musculoskeletal view of a brown-skinned adult showing a split skeletal and muscular anatomy",
      },
    ],
    aliases: ["musculoskeletal", "msk", "bones", "joints", "muscles", "bones joints and muscle", "bones joints & muscle"],
    overview: "The musculoskeletal system combines the skeleton, joints, cartilage, ligaments, tendons, fascia, and skeletal muscle into a load-bearing and movement system that also stores minerals, produces blood cells, and acts as a major metabolic organ.",
    anatomy: [
      ["Axial skeleton", "The skull, vertebral column, ribs, and sternum protect the brain, spinal cord, heart, and lungs while providing a central framework for posture and breathing mechanics."],
      ["Appendicular skeleton", "The shoulder and pelvic girdles connect the upper and lower limbs to the trunk. Long bones and smaller hand and foot bones create levers for precise and powerful movement."],
      ["Joint architecture", "Synovial joints combine articular cartilage, a capsule, synovial lining and fluid, supporting ligaments, and surrounding muscle. Fibrous and cartilaginous joints provide different balances of stability and movement."],
      ["Skeletal muscle", "Muscle fibers bundle into fascicles and whole muscles. Motor units generate force, while muscle spindles and tendon organs report length and tension to the nervous system."],
      ["Tendons, ligaments, and fascia", "Tendons transmit muscle force to bone; ligaments guide and restrain joint motion; fascia links and separates muscle groups and carries vessels and nerves."],
      ["Bone tissue and marrow", "Cortical bone provides a strong outer shell, trabecular bone distributes loads internally, and continual remodeling responds to mechanical and hormonal signals. Marrow supports blood-cell production."],
      ["Regional kinetic chains", "Scapular, spinal, hip, knee, ankle, and foot mechanics transfer force across multiple joints. Function depends on coordinated mobility, stability, strength, and motor control."],
    ],
    pathways: [
      ["Voluntary movement", "Motor command → peripheral nerve → neuromuscular junction → muscle contraction → tendon force → joint movement."],
      ["Load adaptation", "Mechanical strain → bone and connective-tissue signaling → remodeling, repair, and adaptation over time."],
      ["Position feedback", "Receptors in muscle, tendon, joint, and skin → sensory nerves → spinal cord, cerebellum, and brain → refined movement."],
    ],
    connections: ["The nervous system plans motion and receives continuous position feedback.", "Cardiovascular and respiratory systems supply working muscle and clear metabolic by-products.", "Endocrine signals regulate muscle protein, bone remodeling, calcium, and energy availability.", "Marrow, inflammatory signaling, and lymphatic drainage connect movement tissues to immune function."],
  }),
]);

export const PROGRAMS = Object.freeze([
  program({
    id: "primary-care", href: "/bhw-primary-care-demo.html", patientHref: "/bhw-primary-care-demo.html", name: "Primary Care", eyebrow: "Your medical home", aliases: ["primary care", "primary-care", "pc", "apcm", "advanced primary care management"],
    overview: "Primary Care keeps the whole picture together: prevention, new symptoms, ongoing conditions, medications, testing, referrals, and follow-up across every body system.",
    services: ["Preventive visits, screenings, and immunization planning", "Same-day or timely evaluation of new symptoms", "Longitudinal condition and medication coordination", "Lab, imaging, referral, and specialist follow-through"],
    systemIds: CORE_SYSTEM_IDS,
    theme: { ink: "#102a3b", accent: "#82b6b6", glow: "#bdd8dc", signal: "#e6c98a" },
  }),
  program({
    id: "mind-mood", href: "/bhw-mindmood-program.html", patientHref: "/bhw-mindmood-patient-mockup.html", name: "Mind & Mood", eyebrow: "Psychiatry & medication management", aliases: ["mind mood", "mind and mood", "mind & mood", "mind-mood", "psychiatry"],
    overview: "Mind & Mood brings psychiatric evaluation and medication management into the same coordinated health picture, including sleep, cognition, physical health, laboratory context, and treatment response.",
    services: ["Comprehensive psychiatric assessment", "Careful medication starts, changes, and monitoring", "Symptom, sleep, function, and side-effect follow-up", "Coordination with primary care, therapy, and specialists"],
    systemIds: CORE_SYSTEM_IDS,
    theme: { ink: "#2d2438", accent: "#9b7da5", glow: "#ddc8e3", signal: "#d69c60" },
  }),
  program({
    id: "charmed-minds", href: "/bhw-charmed-program.html", patientHref: "/bhw-charmed-patient-mockup.html", name: "CharmEd Minds", eyebrow: "Brain Health & Neurodivergence", aliases: ["charmed", "charmed minds", "charmed-minds", "charmed mind", "brain health", "neurodivergence"],
    overview: "CharmEd Minds connects brain health, neurodevelopment, cognition, sensory processing, sleep, and daily function within a neurodiversity-affirming care plan.",
    services: ["Brain health and neurodevelopmental assessment", "Executive-function and cognitive supports", "Sensory, sleep, and daily-function pattern tracking", "Coordination with medical and psychiatric care when appropriate"],
    systemIds: CORE_SYSTEM_IDS,
    theme: { ink: "#07152f", accent: "#2babab", glow: "#b8a6f2", signal: "#f0b43a" },
    artwork: [
      {
        id: "profile",
        label: "Profile",
        asset: "program-charmed-brain-profile.png",
        alt: "Stylized profile outline containing a luminous blue, violet, and gold brain network",
      },
      {
        id: "forward-one",
        label: "Forward I",
        asset: "program-charmed-brain-forward-v1.png",
        alt: "Stylized forward-facing feminine portrait with a luminous brain network",
      },
      {
        id: "forward-two",
        label: "Forward II",
        asset: "program-charmed-brain-forward-v2.png",
        alt: "Alternate stylized forward-facing feminine portrait with a luminous brain network",
      },
      {
        id: "brain-network",
        label: "Brain network",
        asset: "program-charmed-brain-isolated.png",
        alt: "Stylized blue, violet, and gold brain network viewed from above",
      },
    ],
  }),
  program({
    id: "flow", href: "/bhw-flow-program.html", patientHref: "/bhw-flow-patient-mockup.html", name: "Flow", eyebrow: "Blood & Vascular Care", aliases: ["flow", "flow program", "blood care", "vascular care", "blood and vascular care"],
    overview: "Flow connects blood pressure, circulation, autonomic function, endothelial and microvascular health, oxygen delivery, symptoms, and vascular interventions across the whole body.",
    services: ["Blood-pressure, circulation, and autonomic assessment", "Macrovascular and microvascular risk evaluation", "Symptom, perfusion, and treatment-response tracking", "Medication, movement, hydration, and vascular-care coordination"],
    systemIds: CORE_SYSTEM_IDS,
    theme: { ink: "#07384a", accent: "#1789aa", glow: "#81cee0", signal: "#e7c45a" },
  }),
]);

export const PROGRAM_SYSTEM_CONTEXT = Object.freeze({
  "primary-care": Object.freeze({
    cardiovascular: "Blood pressure, cholesterol, circulation, symptoms, prevention, medications, and cardiovascular follow-through.",
    respiratory: "Breathing symptoms, airway disease, oxygenation, sleep-related breathing, infection, and pulmonary follow-through.",
    digestive: "Digestion, absorption, nutrition, liver and gallbladder function, bowel patterns, and medication effects.",
    neurological: "Headache, dizziness, cognition, sensation, movement, peripheral nerves, spine-related symptoms, and sleep.",
    endocrine: "Thyroid, glucose regulation, adrenal and reproductive hormones, bone metabolism, energy, and temperature regulation.",
    "immune-lymphatic": "Infection, inflammation, autoimmunity, lymphatic function, allergic patterns, and immune-related symptoms.",
    musculoskeletal: "Pain, mobility, strength, joints, connective tissue, injury, rehabilitation, and everyday physical function.",
  }),
  "mind-mood": Object.freeze({
    cardiovascular: "Autonomic arousal, medication effects, sleep, blood-pressure and heart-rate patterns, and physical symptoms that overlap with anxiety.",
    respiratory: "Breathing physiology, sleep-disordered breathing, panic-like symptoms, medication effects, and respiratory contributors to fatigue or cognition.",
    digestive: "The gut-brain axis, appetite, nausea, nutrition, microbiome-related context, and psychiatric medication effects.",
    neurological: "Mood, cognition, sleep, attention, trauma-related responses, sensory experience, and psychiatric treatment response.",
    endocrine: "Thyroid, glucose, reproductive and stress-hormone contributions to mood, sleep, energy, and medication-related metabolic effects.",
    "immune-lymphatic": "Inflammation, post-viral symptoms, fatigue, autoimmune context, and immune signals that may influence mood or cognition.",
    musculoskeletal: "Pain, tension, movement, falls risk, physical function, and the two-way relationship between persistent pain and mood.",
  }),
  "charmed-minds": Object.freeze({
    cardiovascular: "Interoception, autonomic regulation, cerebral perfusion, physical arousal, and the cardiovascular demands placed on cognitive energy.",
    respiratory: "Breathing regulation, sleep quality, respiratory contributors to attention, and the sensory or autonomic experience of breathing.",
    digestive: "Interoception, sensory eating, nutrition, gut-brain signaling, and digestive patterns that affect attention, sleep, or daily function.",
    neurological: "Neurodevelopment, executive function, cognition, sensory processing, learning, sleep, motor planning, and neurodivergent strengths and support needs.",
    endocrine: "Hormonal and metabolic influences on energy, sleep, attention, sensory regulation, development, and cognitive performance.",
    "immune-lymphatic": "Neuroimmune signaling, inflammation, post-viral cognitive change, fatigue, and immune-related effects on brain function.",
    musculoskeletal: "Proprioception, motor planning, coordination, hypermobility, sensory-motor needs, pain, and the physical environment for daily function.",
  }),
  flow: Object.freeze({
    cardiovascular: "Blood pressure, circulation, autonomic regulation, endothelial function, macrovascular and microvascular perfusion, and treatment response.",
    respiratory: "Dyspnea, oxygen delivery, pulmonary circulation, exercise intolerance, and separation of respiratory from perfusion-related symptoms.",
    digestive: "Hydration and salt absorption, post-meal blood pooling, medication tolerance, nutrition, and digestive contributors to vascular stability.",
    neurological: "Cerebral perfusion, brain fog, dizziness, autonomic signaling, neurovascular symptoms, and cognitive effects of altered blood flow.",
    endocrine: "Glucose, lipids, thyroid and other hormonal influences on vascular tone, endothelial health, blood volume, and cardiovascular risk.",
    "immune-lymphatic": "Endothelial inflammation, post-viral vascular injury, immune-mediated vessel effects, edema, and microvascular exchange.",
    musculoskeletal: "The calf-muscle pump, mobility, edema, deconditioning, recumbent or graded activity, and vascular exercise tolerance.",
  }),
});

const simplify = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const systemAliases = new Map(SYSTEMS.flatMap((entry) => [entry.id, entry.shortName, entry.name, ...entry.aliases].map((alias) => [simplify(alias), entry.id])));
const programAliases = new Map(PROGRAMS.flatMap((entry) => [entry.id, entry.name, ...entry.aliases].map((alias) => [simplify(alias), entry.id])));

export function resolveSystemId(value) {
  return systemAliases.get(simplify(value)) || null;
}

export function resolveProgramId(value) {
  return programAliases.get(simplify(value)) || null;
}

export function getSystem(id) {
  const resolved = resolveSystemId(id);
  return SYSTEMS.find((entry) => entry.id === resolved) || null;
}

export function getProgram(id) {
  const resolved = resolveProgramId(id);
  return PROGRAMS.find((entry) => entry.id === resolved) || null;
}

export function visiblePrograms(dashboard) {
  const allowed = new Set((dashboard?.patient?.programs || []).map(resolveProgramId).filter(Boolean));
  return PROGRAMS.filter((entry) => allowed.has(entry.id));
}

export function visibleSystems(dashboard) {
  const records = dashboard?.plan?.systems || [];
  const byId = new Map();
  const additional = [];
  records.forEach((record) => {
    const id = resolveSystemId(record?.id) || resolveSystemId(record?.label);
    if (id && !byId.has(id)) {
      byId.set(id, record);
      return;
    }
    if (id) return;
    const customId = String(record?.id || "").trim().toLowerCase();
    const label = String(record?.label || record?.name || "").trim();
    if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(customId) || !label) return;
    if (!["approved", "clinician-reviewed", "shared"].includes(record?.reviewStatus)) return;
    additional.push({
      id: customId,
      href: null,
      name: String(record?.name || label),
      shortName: label,
      eyebrow: String(record?.eyebrow || "Additional system"),
      asset: null,
      aliases: [],
      overview: String(record?.overview || record?.summary || "This clinician-shared system is part of your Health Blueprint."),
      anatomy: [], pathways: [], connections: [], custom: true, patientRecord: record,
    });
  });
  return [
    ...SYSTEMS.filter((entry) => byId.has(entry.id)).map((entry) => ({ ...entry, patientRecord: byId.get(entry.id) })),
    ...additional,
  ];
}

export function getProgramSystemContext(programId, systemId, patientRecord = {}) {
  const resolvedProgram = resolveProgramId(programId);
  const resolvedSystem = resolveSystemId(systemId) || String(systemId || "").trim().toLowerCase();
  const sharedOverride = patientRecord?.programContext?.[resolvedProgram];
  if (sharedOverride) return String(sharedOverride);
  return PROGRAM_SYSTEM_CONTEXT[resolvedProgram]?.[resolvedSystem] || String(patientRecord?.summary || "");
}

export function isProgramVisible(dashboard, id) {
  const resolved = resolveProgramId(id);
  return Boolean(resolved && visiblePrograms(dashboard).some((entry) => entry.id === resolved));
}

export function isSystemVisible(dashboard, id) {
  const resolved = resolveSystemId(id) || String(id || "").trim().toLowerCase();
  return Boolean(resolved && visibleSystems(dashboard).some((entry) => entry.id === resolved));
}
