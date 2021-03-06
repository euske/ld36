#!/usr/bin/env python
import random

class C:
    def __init__(self, name, (x,y,w,h)):
        self.name = name
        self.x = x
        self.y = y 
        self.w = w
        self.h = h
    def overlap(self, (x,y,w,h)):
        return not (self.x+self.w <= x or x+w <= self.x or
                    self.y+self.h <= y or y+h <= self.y)
    def hasit(self, (x,y)):
        return (self.x <= x and x < self.x+self.w and
                self.y <= y and y < self.y+self.h)

class B:
    def __init__(self):
        self.objs = []
    def get_width(self):
        if self.objs:
            return (max(obj.x+obj.w for obj in self.objs)-
                    min(obj.x for obj in self.objs))
        else:
            return 0
    def get_height(self):
        if self.objs:
            return (max(obj.y+obj.h for obj in self.objs)-
                    min(obj.y for obj in self.objs))
        else:
            return 0
    def dump(self):
        w0 = self.get_width()
        h0 = self.get_height()
        for x in range(w0):
            a = []
            for y in range(h0):
                name = '0'
                for obj1 in self.objs:
                    if obj1.hasit((x,y)):
                        name = obj1.name
                        break
                a.append(name)
            print ' '.join(a)
        return
    def get_conf(self, (w,h)):
        w0 = self.get_width()
        h0 = self.get_height()
        for x in range(w0):
            for y in range(h0):
                ok = True
                for obj1 in self.objs:
                    if obj1.overlap((x,y,w,h)):
                        ok = False
                        break
                if ok:
                    return (x,y,w,h)
                ok = True
                for obj1 in self.objs:
                    if obj1.overlap((x,y,h,w)):
                        ok = False
                        break
                if ok:
                    return (x,y,h,w)
        sizes = (
            max(w0+w, h0, h),
            max(w0+h, h0, w),
            max(w0, w, h0+h),
            max(w0, h, h0+w)
        )
        minconf = 0
        for conf in range(1,len(sizes)):
            if sizes[conf] < sizes[minconf]:
                minconf = conf
        if minconf == 0:
            return (w0,0,w,h)
        elif minconf == 1:
            return (w0,0,h,w)
        elif minconf == 2:
            return (0,h0,w,h)
        else:
            return (0,h0,h,w)
    def add(self, name, size):
        conf = self.get_conf(size)
        self.objs.append(C(name, conf))
        return

N = 3
sizes = [(1,1), (1,2), (1,3)]
b = B()
for i in range(N):
    b.add(str(i+1), random.choice(sizes))
b.dump()
