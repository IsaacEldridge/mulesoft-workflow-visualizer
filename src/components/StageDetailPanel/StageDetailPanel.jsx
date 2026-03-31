import { useWorkflow } from '../../context/WorkflowContext';
import { WORKFLOW_STAGES } from '../../data/workflowData';
import ContentInputPanel from '../ContentInputPanel/ContentInputPanel';
import ContentOutputPanel from '../ContentOutputPanel/ContentOutputPanel';
import SampleDataViewer from './SampleDataViewer';
import styles from './StageDetailPanel.module.css';

export default function StageDetailPanel() {
  const { selectedStage, selectStage } = useWorkflow();

  const stage = WORKFLOW_STAGES.find((s) => s.id === selectedStage);

  if (!stage) return null;

  const handleClose = () => {
    selectStage(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  // Show custom panels for Authoring and Distribution stages
  if (stage.id === 'content-authoring') {
    return (
      <>
        <div className={styles.overlay} onClick={handleClose} />
        <div className={styles.panel} onKeyDown={handleKeyDown}>
          <div className={styles.header} style={{ '--stage-color': stage.color }}>
            <div className={styles.headerContent}>
              <h2 className={styles.title}>{stage.title}</h2>
            </div>
            <button
              className={styles.closeButton}
              onClick={handleClose}
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>
          <div className={styles.content}>
            <ContentInputPanel />
          </div>
        </div>
      </>
    );
  }

  if (stage.id === 'distribution') {
    return (
      <>
        <div className={styles.overlay} onClick={handleClose} />
        <div className={styles.panel} onKeyDown={handleKeyDown}>
          <div className={styles.header} style={{ '--stage-color': stage.color }}>
            <div className={styles.headerContent}>
              <h2 className={styles.title}>{stage.title}</h2>
            </div>
            <button
              className={styles.closeButton}
              onClick={handleClose}
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>
          <div className={styles.content}>
            <ContentOutputPanel />
          </div>
        </div>
      </>
    );
  }

  // Parse GTM collateral from sample data if this is the Distribution stage
  let gtmCollateral = null;
  if (stage.id === 'distribution' && stage.sampleData?.content) {
    try {
      const data = JSON.parse(stage.sampleData.content);
      gtmCollateral = data.gtm_collateral;
    } catch (e) {
      // Ignore parse errors
    }
  }

  return (
    <>
      <div className={styles.overlay} onClick={handleClose} />
      <div className={styles.panel} onKeyDown={handleKeyDown}>
        <div className={styles.header} style={{ '--stage-color': stage.color }}>
          <div className={styles.headerContent}>
            <h2 className={styles.title}>{stage.title}</h2>
            <div className={styles.stageNumber}>
              Stage {stage.order} of 6
            </div>
          </div>
          <button
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>👥 Team Owner</h3>
            <div className={styles.ownerBadge} style={{ borderColor: stage.color }}>
              {stage.owner}
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>📍 Location</h3>
            <p className={styles.text}>{stage.location}</p>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>ℹ️ Overview</h3>
            <p className={styles.text}>{stage.description}</p>
          </div>

          {gtmCollateral && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>🚀 AI-Generated GTM Collateral (First Drafts)</h3>
              <div className={styles.gtmGrid}>
                {gtmCollateral.blog_post && (
                  <div className={styles.gtmCard}>
                    <div className={styles.gtmCardHeader}>
                      <span className={styles.gtmIcon}>📝</span>
                      <h4 className={styles.gtmCardTitle}>Blog Post</h4>
                    </div>
                    <div className={styles.gtmCardContent}>
                      <p className={styles.gtmTitle}>{gtmCollateral.blog_post.title}</p>
                      <p className={styles.gtmDetail}>{gtmCollateral.blog_post.excerpt}</p>
                      <div className={styles.gtmMeta}>
                        <span>📊 {gtmCollateral.blog_post.word_count} words</span>
                        <span>🌐 <a href={gtmCollateral.blog_post.target_url} target="_blank" rel="noopener noreferrer">blogs.mulesoft.com</a></span>
                      </div>
                    </div>
                  </div>
                )}

                {gtmCollateral.marketing_announcement && (
                  <div className={styles.gtmCard}>
                    <div className={styles.gtmCardHeader}>
                      <span className={styles.gtmIcon}>📢</span>
                      <h4 className={styles.gtmCardTitle}>Marketing Announcement</h4>
                    </div>
                    <div className={styles.gtmCardContent}>
                      <p className={styles.gtmTitle}>{gtmCollateral.marketing_announcement.subject}</p>
                      <p className={styles.gtmDetail}>{gtmCollateral.marketing_announcement.body_preview}</p>
                      <div className={styles.gtmMeta}>
                        <span>📊 {gtmCollateral.marketing_announcement.word_count} words</span>
                      </div>
                    </div>
                  </div>
                )}

                {gtmCollateral.trailhead_outline && (
                  <div className={styles.gtmCard}>
                    <div className={styles.gtmCardHeader}>
                      <span className={styles.gtmIcon}>🎓</span>
                      <h4 className={styles.gtmCardTitle}>Trailhead Module</h4>
                    </div>
                    <div className={styles.gtmCardContent}>
                      <p className={styles.gtmTitle}>{gtmCollateral.trailhead_outline.module_title}</p>
                      <p className={styles.gtmDetail}>
                        {gtmCollateral.trailhead_outline.units} units covering: {gtmCollateral.trailhead_outline.topics.join(', ')}
                      </p>
                      <div className={styles.gtmMeta}>
                        <span>⏱️ {gtmCollateral.trailhead_outline.estimated_duration}</span>
                        <span>📖 <a href={gtmCollateral.trailhead_outline.guidelines_url} target="_blank" rel="noopener noreferrer">Guidelines</a></span>
                      </div>
                    </div>
                  </div>
                )}

                {gtmCollateral.video_script && (
                  <div className={styles.gtmCard}>
                    <div className={styles.gtmCardHeader}>
                      <span className={styles.gtmIcon}>🎬</span>
                      <h4 className={styles.gtmCardTitle}>Video Script</h4>
                    </div>
                    <div className={styles.gtmCardContent}>
                      <p className={styles.gtmTitle}>{gtmCollateral.video_script.title}</p>
                      <p className={styles.gtmDetail}>{gtmCollateral.video_script.script_preview}</p>
                      <div className={styles.gtmMeta}>
                        <span>⏱️ {gtmCollateral.video_script.estimated_duration}</span>
                        <span>🎥 {gtmCollateral.video_script.scenes} scenes</span>
                        <span>📖 <a href={gtmCollateral.video_script.guidelines_url} target="_blank" rel="noopener noreferrer">Guidelines</a></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>⚙️ Technical Implementation</h3>
            <ul className={styles.technicalList}>
              {stage.technicalDetails.map((detail, idx) => (
                <li key={idx} className={styles.technicalItem}>
                  <span className={styles.techBullet}>▸</span>
                  {detail}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>👤 Participants</h3>
            <ul className={styles.list}>
              {stage.participants.map((p, idx) => (
                <li key={idx}>{p}</li>
              ))}
            </ul>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>🛠️ Tools & Technologies</h3>
            <div className={styles.toolsGrid}>
              {stage.tools.map((t, idx) => (
                <div key={idx} className={styles.toolBadge}>
                  {t}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <SampleDataViewer sampleData={stage.sampleData} />
          </div>
        </div>
      </div>
    </>
  );
}
