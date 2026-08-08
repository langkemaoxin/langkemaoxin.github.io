---
title: "领域层设计：聚合、副作用与领域事件"
sidebarGroup: "战术与分层"
shortTitle: "12 领域层规范"
order: 12
date: 2026-11-08
category: "软件架构"
tag:
  - "DDD"
  - "领域层"
  - "领域事件"
  - "ECS"
  - "战术设计"
---

> **DDD 领域驱动设计 · 第 12/15 篇**  
> 上一篇：[11 Repository](/软件架构/ddd-tactics/ddd-11-repository) · 下一篇：[13 应用层与接口层](/软件架构/ddd-tactics/ddd-13-application-interface)

---

## 领域层为何最难

领域层直接影响 Application、Infrastructure 的设计。规则应放在 Entity、Value Object 还是 Domain Service，既要可扩展又要避免过度设计。本文用「龙与魔法」小游戏演示 **OOP → ECS → DDD** 三种思路，并归纳 Entity 规范、领域服务分类与**领域事件**处理副作用。

---

## 1. 领域模型：分类与生命周期

**Model** 承载业务属性与行为（充血模型），分三类：

| 类型 | 特征 | 复杂度 |
|------|------|--------|
| **Entity** | 有全局唯一 ID，状态可变，有生命周期 | 中 |
| **Value Object** | 无 ID，不可变，无生命周期 | 低 |
| **Service** | 无状态；规则不适合放进 Entity/VO 时 | 高 |

优先选简单模型：**VO > Entity > Service**。

**生命周期支撑**：

- **Factory**：创建 Model，注入 Repository  
- **Aggregate Root**：封装不变性；聚合宜小；聚合间用 ID 关联；聚合内强一致、聚合间最终一致  
- **Repository**：Model 访问数据源的网关  

---

## 2. 业务场景：龙与魔法（极简规则）

**角色**：Player（Fighter / Mage / Dragoon）、Monster（Orc / Elf / Dragon）、Weapon（Sword / Staff，带 damageType：物理 0、魔法 1、冰 2 等）。

**战斗规则**：

- Orc：物理伤害减半  
- Elf：魔法伤害减半  
- Dragon：物理/魔法免疫；**Dragoon** 攻击 Dragon 伤害加倍  

### 2.1 OOP 继承实现

```java
public abstract class Player {
    Weapon weapon;
}

public class Monster {
    Long health;

    public void receiveDamageBy(Weapon weapon, Player player) {
        this.health -= weapon.getDamage();
    }
}

public class Orc extends Monster {
    @Override
    public void receiveDamageBy(Weapon weapon, Player player) {
        if (weapon.getDamageType() == 0) {
            this.setHealth(this.getHealth() - weapon.getDamage() / 2);
        } else {
            super.receiveDamageBy(weapon, player);
        }
    }
}

public class Dragon extends Monster {
    @Override
    public void receiveDamageBy(Weapon weapon, Player player) {
        if (player instanceof Dragoon) {
            this.setHealth(this.getHealth() - weapon.getDamage() * 2);
        }
        // 否则免疫
    }
}
```

单测可过，但扩展时暴露三类缺陷。

### 2.2 OOP 的三类缺陷

**缺陷一：强类型无法表达业务规则**

「Fighter 只能装备剑」用子类 `private Sword weapon` 会 Variable Hiding，父类 `Weapon` 与子类字段不一致；「Fighter 和 Mage 都能装备匕首」则继承体系需推翻重构。

**缺陷二：违反开闭原则**

新增「狙击枪一击必杀」需改 `Weapon`、所有 `Player` 子类、所有 `Monster` 子类的 `receiveDamageBy`——变更面不可控。

**缺陷三：多对象相似行为导致重复**

Move、Jump、Run 无法多继承，`Player` 与 `Monster` 各写一遍移动逻辑。

**本质问题**：规则归属是对象「行为」还是独立「规则对象」？通用行为如何复用？——电商优惠、交易链路与本例同构。

---

## 3. ECS 架构：可借鉴之处

**Entity-Component-System** 为游戏性能与扩展性设计：

- **Entity**：主要是 ID + 组件袋  
- **Component**：纯数据（位置、血量等）  
- **System**：纯行为，批量处理同类组件  

`CombatSystem` 统一处理 `Player.attack` vs `Monster.receiveDamage` 的归属问题；**数据驱动**通过组件组合改变玩法（水壶 + 爆炸 = 爆炸水壶）。

**ECS 的局限**：为性能强调 State/Behavior 分离、直接操作数据；商业系统优先**正确性、一致性**，ECS 在大型业务中少见。但 **组件化、行为抽离、数据驱动** 仍可借鉴。

---

## 4. DDD 解法概览

### 4.1 领域对象

用 **Enum**（`PlayerClass`、`MonsterClass`）替代继承；`Weapon` 为 Entity（同名武器可并存，未来可有 buff/耐久）。

```java
public class Player implements Movable {
    private PlayerId id;
    private String name;
    private PlayerClass playerClass;
    private WeaponId weaponId;  // 只存 ID，不直接引用 Weapon 实体
    private Transform position = Transform.ORIGIN;
    private Vector velocity = Vector.ZERO;
}

public class Monster implements Movable {
    private MonsterId id;
    private MonsterClass monsterClass;
    private Health health;
    private Transform position = Transform.ORIGIN;
    private Vector velocity = Vector.ZERO;
}
```

**组件化**：`Movable` 接口 + `Transform`/`Vector` 值对象，类似 ECS 的 Movement，但 Entity 仍保有内聚行为；**无 public setter**，状态变更走方法。

### 4.2 装备：单对象策略型 Domain Service

Entity **不能** `@Autowired EquipmentService`。正确做法：**Double Dispatch**，通过方法参数传入：

```java
public class Player {
    public void equip(Weapon weapon, EquipmentService equipmentService) {
        if (equipmentService.canEquip(this, weapon)) {
            this.weaponId = weapon.getId();
        } else {
            throw new IllegalArgumentException("Cannot Equip: " + weapon);
        }
    }
}
```

`EquipmentService` 内用 **Policy/Strategy** 链式判断，新规则加新 Policy 类即可：

```java
public class FighterEquipmentPolicy implements EquipmentPolicy {
    @Override
    public boolean canApply(Player player, Weapon weapon) {
        return player.getPlayerClass() == PlayerClass.Fighter;
    }

    @Override
    public boolean canEquip(Player player, Weapon weapon) {
        return weapon.getWeaponType() == WeaponType.Sword
                || weapon.getWeaponType() == WeaponType.Dagger;
    }
}
```

### 4.3 攻击：跨对象事务型 Domain Service

攻击影响 Player、Monster、Weapon，属于跨实体逻辑，由 `CombatService` 负责：

```java
public class CombatServiceImpl implements CombatService {
    private WeaponRepository weaponRepository;
    private DamageManager damageManager;

    @Override
    public void performAttack(Player player, Monster monster) {
        Weapon weapon = weaponRepository.find(player.getWeaponId());
        int damage = damageManager.calculateDamage(player, weapon, monster);
        if (damage > 0) {
            monster.takeDamage(damage);
        }
    }
}
```

`DamagePolicy` **只计算伤害**，不直接改 Monster——便于单测与多 Policy 叠加：

```java
public class DragoonPolicy implements DamagePolicy {
    @Override
    public boolean canApply(Player player, Weapon weapon, Monster monster) {
        return player.getPlayerClass() == PlayerClass.Dragoon
                && monster.getMonsterClass() == MonsterClass.Dragon;
    }

    @Override
    public int calculateDamage(Player player, Weapon weapon, Monster monster) {
        return weapon.getDamage() * 2;
    }
}
```

**注意**：`EquipmentService`（只读策略、单对象）可参数注入；`CombatService`（多对象副作用）应直接调用，**不要** `Player.attack(monster, combatService)` 把副作用藏进 Entity。

### 4.4 移动：通用组件型 Domain Service

`MovementSystem` 注册多个 `Movable`，统一边界与 tick——类似 ECS System，但不弱化 Entity 一致性。

### 三种架构对比

| | OOP 继承 | ECS | DDD |
|---|----------|-----|-----|
| 上手 | 最易 | 中 | 最难 |
| 扩展 | 改继承树 | 加组件/系统 | 加 Policy / Service |
| 一致性 | 分散 | 弱（行为全在 System） | Entity 内聚 + Service 编排 |
| 适用 | 规则极少 | 高性能游戏 | 商业复杂域 |

---

## 5. Entity 设计五条原则

**核心**：无论外部如何操作，实体内部属性不冲突、状态一致。

**原则 1 — 创建即一致**

构造器包含全部必要属性并校验；或用 Factory 降低调用复杂度：

```java
public Account(String accountNumber, Long amount) {
    assert StringUtils.isNotBlank(accountNumber);
    assert amount >= 0;
    this.accountNumber = accountNumber;
    this.amount = amount;
}
```

**原则 2 — 尽量避免 public setter**

用行为方法改状态，如 `pay()` / `ship()` 同步更新 status 与子实体：

```java
@Data
@Setter(AccessLevel.PRIVATE)
public class Order {
    private int status;
    private Payment payment;
    private Shipping shipping;

    public void pay(Long userId, Long amount) {
        if (status != 0) throw new IllegalStateException();
        this.status = 1;
        this.payment = new Payment(userId, amount);
    }
}
```

建议 `setPosition` → `moveTo`，增强语义。

**原则 3 — 聚合根保证父子一致**

子实体不单独暴露、不单独 Repository；多子实体一致性由根保障（见 [Repository 一文](/软件架构/ddd-tactics/ddd-11-repository)）。

**原则 4 — 不强依赖其他聚合根或领域服务**

- 只存外部实体 **强类型 ID**（`UserId` 而非 `int`）  
- 「无副作用」依赖通过**方法入参**传入（如 `equip(weapon, equipmentService)`）  
- 有副作用的跨聚合操作 → Domain Service  

**原则 5 — 行为只直接影响本实体（及子实体）**

避免 Entity 方法直接改其他 Aggregate；可读性与变更风险可控。

**原则 6（补充）**：充血模型**不含持久化逻辑**。

---

## 6. Domain Service 三种类型

| 类型 | 场景 | 调用方式 |
|------|------|----------|
| **单对象策略型** | 单实体变更 + 多对象/外部规则 | 参数注入 + Double Dispatch |
| **跨对象事务型** | 同时改多个实体 | 直接调 Service，如 `combatService.performAttack` |
| **通用组件型** | 跨实体通用能力（移动、渲染） | System 式注册与 batch 处理 |

### Double Dispatch 示意

![双重分发：先多态 accept，再静态绑定 method(this)](/软件架构/ali/p89-01.png)

`player.equip(weapon, equipmentService)` → `equipmentService.canEquip(this, weapon)`：先动态绑定实体方法，再静态绑定 Service 的重载。

**错误写法**：

```java
// ❌ 先调 Service 再 equip，可能不一致
boolean canEquip = equipmentService.canEquip(player, weapon);
if (canEquip) player.equip(weapon);

// ❌ Entity 内委托 CombatService，副作用不可见
void attack(Monster m, CombatService svc) {
    svc.performAttack(this, m);
}
```

---

## 7. 领域事件：处理副作用

规则：Monster 死亡 → Player 获得经验；经验满 100 → 升级；升级再触发奖励……全写在 `CombatService` 会迅速膨胀。

**领域事件**把隐性副作用**显性化**：触发与处理解耦。

```java
public class Player {
    public void receiveExp(int value) {
        this.exp += value;
        if (this.exp >= 100) {
            LevelUpEvent event = new LevelUpEvent(this);
            EventBus.dispatch(event);
            this.exp = 0;
        }
    }
}
```

与 MQ 不同：领域事件通常**同进程、可同步/异步**，可用 EventBus + Dispatcher 实现。

**现状缺陷**：

- 依赖框架级 EventBus / Invoker  
- Entity 不宜依赖外部，EventBus 常为**全局 Singleton**，单测 Entity 困难  
- 备选：Entity 内 `List<Event>` 收集，调用方显式 dispatch——仍偏啰嗦  

尽管有缺陷，领域事件仍是 DDD 推荐的**跨实体副作用**传播机制，优于在核心 Service 里堆 if-else 链。

---

## 8. 设计决策清单

真实业务总有「特殊性」，100% 教条不现实。做决策时可问：

- 只影响单一对象还是多个？  
- 规则未来如何扩展？  
- 性能约束？  
- 副作用用 Domain Service 还是 Domain Event？  

好架构是在多种因素间的**平衡**，而非唯一正确答案。

---

## 小结

| 主题 | 要点 |
|------|------|
| Entity | 创建即一致、少 setter、聚合根、强类型 ID、行为边界 |
| Domain Service | 策略型 / 事务型 / 组件型，调用方式不同 |
| Policy | 无状态单例，`canApply` + 计算，不直接改对象 |
| Domain Event | 副作用显性化；注意 EventBus 与可测试性权衡 |

下一篇进入 **Application 与 Interface 层**：用例编排、DTO 边界，以及 DDD 与微服务的区别。
