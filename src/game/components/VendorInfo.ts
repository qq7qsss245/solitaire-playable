import { GameObjects, Scene } from 'phaser';
import { AssetKeys } from '../../assets';

// 厂商信息组件配置接口
export interface VendorInfoConfig {
    icon: { x: number, y: number, scale: number };
    productName: { x: number, y: number, scale: number };
    fiveStars: { x: number, y: number, scale: number };
}

/**
 * 厂商信息组件
 * 包含左侧icon和右侧product-name、five-stars的布局
 */
export class VendorInfo extends GameObjects.Container {
    private iconImage!: GameObjects.Image;
    private productNameImage!: GameObjects.Image;
    private fiveStarsImage!: GameObjects.Image;
    private config: VendorInfoConfig;
    
    constructor(scene: Scene, config: VendorInfoConfig) {
        // 使用默认位置初始化容器，后续通过updateLayout设置具体位置
        super(scene, 0, 0);
        
        this.config = config;
        
        // 创建组件视觉元素
        this.createVisualElements();
        
        // 初始化布局
        this.updateLayout();
        
        // 添加到场景
        scene.add.existing(this);
    }
    
    /**
     * 创建视觉元素
     */
    private createVisualElements(): void {
        // 创建icon图片
        this.iconImage = this.scene.add.image(0, 0, AssetKeys.ICON);
        this.add(this.iconImage);
        
        // 创建product-name图片
        this.productNameImage = this.scene.add.image(0, 0, AssetKeys.PRODUCT_NAME);
        this.add(this.productNameImage);
        
        // 创建five-stars图片
        this.fiveStarsImage = this.scene.add.image(0, 0, AssetKeys.FIVE_STARS);
        this.add(this.fiveStarsImage);
    }
    
    /**
     * 更新布局 - 直接使用当前布局的vendorInfo配置
     */
    public updateLayout(): void {
        // 应用icon配置
        const iconConfig = this.config.icon;
        this.iconImage.setPosition(0, 0); // icon作为参考点，放在容器中心
        this.iconImage.setScale(iconConfig.scale);
        
        // 应用product-name配置 - 相对于icon的位置
        const productNameConfig = this.config.productName;
        this.productNameImage.setPosition(
            productNameConfig.x - iconConfig.x,
            productNameConfig.y - iconConfig.y
        );
        this.productNameImage.setScale(productNameConfig.scale);
        
        // 应用five-stars配置 - 相对于icon的位置
        const fiveStarsConfig = this.config.fiveStars;
        this.fiveStarsImage.setPosition(
            fiveStarsConfig.x - iconConfig.x,
            fiveStarsConfig.y - iconConfig.y
        );
        this.fiveStarsImage.setScale(fiveStarsConfig.scale);
        
        // 设置容器的位置为icon的配置位置
        this.setPosition(iconConfig.x, iconConfig.y);
        
        // 设置可见性
        this.setVisible(true);
    }
    
    /**
     * 设置组件的可见性
     */
    public setVisible(visible: boolean): this {
        super.setVisible(visible);
        return this;
    }
    
    /**
     * 设置组件的透明度
     */
    public setAlpha(alpha: number): this {
        super.setAlpha(alpha);
        return this;
    }
    
    /**
     * 获取组件的边界框
     */
    public getBounds(): Phaser.Geom.Rectangle {
        // 计算整个组件的边界框
        const iconBounds = this.iconImage.getBounds();
        const productNameBounds = this.productNameImage.getBounds();
        const fiveStarsBounds = this.fiveStarsImage.getBounds();
        
        const minX = Math.min(iconBounds.x, productNameBounds.x, fiveStarsBounds.x);
        const maxX = Math.max(iconBounds.right, productNameBounds.right, fiveStarsBounds.right);
        const minY = Math.min(iconBounds.y, productNameBounds.y, fiveStarsBounds.y);
        const maxY = Math.max(iconBounds.bottom, productNameBounds.bottom, fiveStarsBounds.bottom);
        
        return new Phaser.Geom.Rectangle(minX, minY, maxX - minX, maxY - minY);
    }
    
    /**
     * 销毁组件
     */
    public destroy(fromScene?: boolean): void {
        // 清理子元素
        if (this.iconImage) {
            this.iconImage.destroy();
        }
        if (this.productNameImage) {
            this.productNameImage.destroy();
        }
        if (this.fiveStarsImage) {
            this.fiveStarsImage.destroy();
        }
        
        // 调用父类销毁方法
        super.destroy(fromScene);
    }
}