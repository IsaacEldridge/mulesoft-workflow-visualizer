import { useWorkflow } from '../../context/WorkflowContext';
import * as Icons from '../icons';
import styles from './StageNode.module.css';

export default function StageNode({ stage }) {
  const {
    selectedStage,
    selectStage,
    currentStage,
    completedStages,
  } = useWorkflow();

  const isActive = currentStage === stage.id;
  const isCompleted = completedStages.includes(stage.id);
  const isSelected = selectedStage === stage.id;
  const isInactive = stage.active === false;

  const Icon = Icons[stage.icon];

  const handleClick = () => {
    if (!isInactive) {
      selectStage(stage.id);
    }
  };

  const handleKeyDown = (e) => {
    if (!isInactive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      selectStage(stage.id);
    }
  };

  const classNames = [
    styles.stageNode,
    isActive && styles.active,
    isCompleted && styles.completed,
    isSelected && styles.selected,
    isInactive && styles.inactive,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      style={{
        left: `${stage.position.x}%`,
        top: `${stage.position.y}%`,
        '--stage-color': stage.color,
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${stage.title} - ${stage.owner}`}
    >
      <div className={styles.iconContainer}>
        {Icon && <Icon className={styles.icon} size={32} />}
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>{stage.shortTitle}</h3>
        <p className={styles.owner}>{stage.owner}</p>
      </div>
      {isCompleted && (
        <div className={styles.completedBadge}>
          <Icons.CheckIcon size={16} />
        </div>
      )}
    </div>
  );
}
