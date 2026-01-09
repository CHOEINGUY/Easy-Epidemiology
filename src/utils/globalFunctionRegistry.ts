/**
 * globalFunctionRegistry.ts
 * 전역 함수 레지스트리 시스템
 * 메모리 누수를 방지하면서 전역 함수를 안전하게 관리합니다.
 */

interface FunctionRegistration {
    func: Function;
    componentInstance: object;
    timestamp: number;
}

class GlobalFunctionRegistry {
    private registrations: Map<string, FunctionRegistration>;
    private componentInstances: WeakMap<object, Set<string>>;

    constructor() {
        this.registrations = new Map<string, FunctionRegistration>();
        this.componentInstances = new WeakMap<object, Set<string>>();
    }

    /**
     * 컴포넌트 인스턴스와 함께 전역 함수를 등록
     * @param functionName - 전역 함수명
     * @param func - 등록할 함수
     * @param componentInstance - 컴포넌트 인스턴스
     */
    register(functionName: string, func: Function, componentInstance: object): void {
        if (typeof window === 'undefined')
            return;

        // 기존 등록이 있다면 정리
        this.unregister(functionName);

        // 전역에 함수 등록
        (window as any)[functionName] = func;

        // 등록 정보 저장
        this.registrations.set(functionName, {
            func,
            componentInstance,
            timestamp: Date.now()
        });

        // 컴포넌트 인스턴스와 함수명 연결
        let instanceSet = this.componentInstances.get(componentInstance);
        if (!instanceSet) {
            instanceSet = new Set<string>();
            this.componentInstances.set(componentInstance, instanceSet);
        }
        instanceSet.add(functionName);

        console.log(`[GlobalFunctionRegistry] 함수 등록: ${functionName}`);
    }

    /**
     * 특정 함수명의 전역 함수 제거
     * @param functionName - 제거할 함수명
     */
    unregister(functionName: string): void {
        if (typeof window === 'undefined')
            return;

        const registration = this.registrations.get(functionName);
        if (registration) {
            // 전역에서 제거
            delete (window as any)[functionName];

            // 컴포넌트 인스턴스에서도 제거
            const { componentInstance } = registration;
            if (componentInstance) {
                const instanceSet = this.componentInstances.get(componentInstance);
                if (instanceSet) {
                    instanceSet.delete(functionName);
                    // 해당 컴포넌트의 모든 함수가 제거되었으면 컴포넌트도 제거
                    if (instanceSet.size === 0) {
                        this.componentInstances.delete(componentInstance);
                    }
                }
            }

            // 등록 정보 제거
            this.registrations.delete(functionName);
            console.log(`[GlobalFunctionRegistry] 함수 제거: ${functionName}`);
        }
    }

    /**
     * 컴포넌트 인스턴스와 관련된 모든 전역 함수 제거
     * @param componentInstance - 컴포넌트 인스턴스
     */
    unregisterAllForComponent(componentInstance: object): void {
        if (typeof window === 'undefined')
            return;

        const functionNames = this.componentInstances.get(componentInstance);
        if (functionNames) {
            // 복사본을 만들어서 순회 (Set을 순회하면서 삭제하면 문제 발생)
            const namesToRemove = Array.from(functionNames);
            namesToRemove.forEach(functionName => {
                this.unregister(functionName);
            });
        }
    }

    /**
     * 모든 전역 함수 정리
     */
    clearAll(): void {
        if (typeof window === 'undefined')
            return;

        const functionNames = Array.from(this.registrations.keys());
        functionNames.forEach(functionName => {
            this.unregister(functionName);
        });
        console.log('[GlobalFunctionRegistry] 모든 전역 함수 정리 완료');
    }

    /**
     * 등록된 함수 목록 조회 (디버깅용)
     */
    getRegisteredFunctions(): string[] {
        return Array.from(this.registrations.keys());
    }

    /**
     * 특정 함수가 등록되어 있는지 확인
     * @param functionName - 확인할 함수명
     */
    isRegistered(functionName: string): boolean {
        return this.registrations.has(functionName);
    }
}

// 싱글톤 인스턴스 생성
const globalFunctionRegistry = new GlobalFunctionRegistry();
export default globalFunctionRegistry;
